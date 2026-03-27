const mongoose = require("mongoose");

function normalizeVatNumber(v) {
    return String(v || "").replace(/[^\d]/g, "");
}

function normalizeTaxCode(v) {
    const s = String(v || "")
        .trim()
        .replace(/\s+/g, "")
        .toUpperCase();

    return s || null;
}

function normalizeSdiCode(v) {
    const s = String(v || "")
        .trim()
        .replace(/\s+/g, "")
        .toUpperCase();

    return s || null;
}

function normalizePec(v) {
    const s = String(v || "")
        .trim()
        .toLowerCase();

    return s || null;
}

function isValidSdiCode(v) {
    const s = normalizeSdiCode(v);
    if (!s) return false;
    return /^[A-Z0-9]{7}$/.test(s);
}

function isValidPec(v) {
    const s = normalizePec(v);
    if (!s) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Validazione P.IVA italiana (11 cifre) con checksum
function isValidItalianVatNumber(v) {
    const p = normalizeVatNumber(v);

    if (!/^\d{11}$/.test(p)) return false;
    if (p === "00000000000") return false;

    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let n = p.charCodeAt(i) - 48;
        if (i % 2 === 1) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
    }
    const check = (10 - (sum % 10)) % 10;
    return check === (p.charCodeAt(10) - 48);
}

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        passwordHash: { type: String, required: true },

        customerType: {
            type: String,
            enum: ["private", "piva"],
            required: true,
        },

        billingAddressRef: { type: mongoose.Schema.Types.ObjectId, ref: "Address", default: null },

        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },

        companyName: {
            type: String,
            trim: true,
            default: null,
            validate: [
                {
                    validator: function (v) {
                        if (this.customerType !== "piva") return true;
                        return String(v || "").trim().length > 0;
                    },
                    message: "Ragione sociale obbligatoria per clienti P.IVA",
                },
            ],
        },
        vatNumber: {
            type: String,
            trim: true,
            default: null,
            set: (v) => {
                const n = normalizeVatNumber(v);
                return n ? n : null;
            },
            validate: [
                {
                    validator: function (v) {
                        // se non è P.IVA, va bene anche null/vuoto
                        if (this.customerType !== "piva") return true;
                        return Boolean(v) && isValidItalianVatNumber(v);
                    },
                    message: "Partita IVA non valida",
                },
            ],
        },

        taxCode: {
            type: String,
            trim: true,
            default: null,
            set: (v) => normalizeTaxCode(v),
            validate: [
                {
                    validator: function (v) {
                        if (this.customerType !== "piva") return true;
                        return String(v || "").trim().length > 0;
                    },
                    message: "Codice fiscale obbligatorio per clienti P.IVA",
                },
            ],
        },

        sdiCode: {
            type: String,
            trim: true,
            default: null,
            set: (v) => normalizeSdiCode(v),
        },

        pec: {
            type: String,
            trim: true,
            default: null,
            set: (v) => normalizePec(v),
        },


        role: { type: String, enum: ["user", "admin"], default: "user" },

        passwordChangedAt: { type: Date, default: null },
        resetPasswordTokenHash: { type: String, default: null, index: true },

        resetPasswordExpiresAt: { type: Date, default: null, index: true },
        resetPasswordUsedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

UserSchema.pre("validate", function () {
    if (this.customerType !== "piva") return;

    const sdi = normalizeSdiCode(this.sdiCode);
    const pec = normalizePec(this.pec);

    const hasSdi = !!sdi;
    const hasPec = !!pec;
    const pecValid = hasPec ? isValidPec(pec) : false;

    if (!hasSdi && !hasPec) {
        this.invalidate("sdiCode", "Inserisci almeno uno tra Codice SDI e PEC");
        this.invalidate("pec", "Inserisci almeno uno tra Codice SDI e PEC");
        return;
    }

    if (hasSdi && !isValidSdiCode(sdi)) {
        this.invalidate("sdiCode", "Codice SDI non valido");
    }

    if (sdi === "0000000" && !pecValid) {
        this.invalidate("sdiCode", "Se inserisci 0000000 devi indicare anche una PEC valida");
        if (!hasPec) {
            this.invalidate("pec", "Con Codice SDI 0000000 la PEC è obbligatoria");
        }
    }

    if (hasPec && !pecValid) {
        this.invalidate("pec", "PEC non valida");
    }
});

UserSchema.methods.toSafeObject = function () {
    return {
        id: this._id,
        email: this.email,
        role: this.role,

        customerType: this.customerType,
        firstName: this.firstName,
        lastName: this.lastName,
        phone: this.phone,

        companyName: this.companyName,
        vatNumber: this.vatNumber,
        taxCode: this.taxCode,
        sdiCode: this.sdiCode,
        pec: this.pec,
        billingAddressRef: this.billingAddressRef,

        createdAt: this.createdAt,
        updatedAt: this.updatedAt,


    };
};

module.exports = mongoose.model("User", UserSchema);
