const mongoose = require("mongoose");

function normalizeVatNumber(v) {
    return String(v || "").replace(/[^\d]/g, "");
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

        role: { type: String, enum: ["user", "admin"], default: "user" },

        resetPasswordTokenHash: { type: String, default: null, index: true },
        resetPasswordExpiresAt: { type: Date, default: null, index: true },
        resetPasswordUsedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

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
        billingAddressRef: this.billingAddressRef,

        createdAt: this.createdAt,
        updatedAt: this.updatedAt,


    };
};

module.exports = mongoose.model("User", UserSchema);
