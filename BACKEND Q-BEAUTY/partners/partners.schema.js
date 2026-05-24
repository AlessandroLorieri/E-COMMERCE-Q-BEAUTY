const mongoose = require("mongoose");

function normalizeText(v) {
    return String(v || "").trim();
}

function normalizeUpper(v) {
    return String(v || "").trim().toUpperCase();
}

function normalizePartnerCouponCode(v) {
    const code = String(v || "").trim().toUpperCase().replace(/\s+/g, "");
    return code || undefined;
}

function normalizeLower(v) {
    return String(v || "").trim().toLowerCase();
}

function normalizeCap(v) {
    return String(v || "").replace(/\D/g, "").trim();
}

function normalizeUrl(v) {
    const raw = String(v || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
}

const partnerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: "",
            trim: true,
            set: normalizeText,
        },

        slug: {
            type: String,
            default: "",
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
            set: normalizeLower,
        },

        address: {
            type: String,
            default: "",
            trim: true,
            set: normalizeText,
        },

        cap: {
            type: String,
            default: "",
            trim: true,
            set: normalizeCap,
        },

        city: {
            type: String,
            default: "",
            trim: true,
            set: normalizeText,
        },

        province: {
            type: String,
            default: "",
            trim: true,
            uppercase: true,
            set: normalizeUpper,
        },

        region: {
            type: String,
            default: "",
            trim: true,
            set: normalizeText,
        },

        lat: {
            type: Number,
            default: null,
        },

        lng: {
            type: Number,
            default: null,
        },

        phone: {
            type: String,
            default: "",
            trim: true,
            set: normalizeText,
        },

        email: {
            type: String,
            default: "",
            trim: true,
            lowercase: true,
            set: normalizeLower,
        },

        partnerCouponCode: {
            type: String,
            trim: true,
            uppercase: true,
            set: normalizePartnerCouponCode,
        },

        partnerCouponEnabled: {
            type: Boolean,
            default: false,
            index: true,
        },

        associationStartedAt: {
            type: Date,
            default: null,
        },

        associationExpiresAt: {
            type: Date,
            default: null,
            index: true,
        },

        associationLastOrderRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
            index: true,
        },

        associationLastOrderPublicId: {
            type: String,
            default: "",
            trim: true,
        },

        associationLastOrderAt: {
            type: Date,
            default: null,
        },

        website: {
            type: String,
            default: "",
            trim: true,
            set: normalizeUrl,
        },

        instagram: {
            type: String,
            default: "",
            trim: true,
            set: normalizeUrl,
        },

        services: {
            type: [String],
            default: [],
        },

        treatments: {
            type: [String],
            default: [],
        },

        description: {
            type: String,
            default: "",
            trim: true,
            set: normalizeText,
        },

        image: {
            type: String,
            default: "",
            trim: true,
            set: normalizeUrl,
        },

        gallery: {
            type: [String],
            default: [],
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        sortOrder: {
            type: Number,
            default: 0,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

partnerSchema.index(
    { partnerCouponCode: 1 },
    {
        unique: true,
        partialFilterExpression: {
            partnerCouponCode: { $type: "string", $ne: "" },
        },
    }
);

partnerSchema.index({ associationExpiresAt: 1, isActive: 1 });

partnerSchema.pre("save", function () {
    if (Array.isArray(this.services)) {
        this.services = this.services
            .map((v) => normalizeText(v))
            .filter(Boolean);
    }

    if (Array.isArray(this.treatments)) {
        this.treatments = this.treatments
            .map((v) => normalizeText(v))
            .filter(Boolean);
    }

    if (Array.isArray(this.gallery)) {
        this.gallery = this.gallery
            .map((v) => normalizeUrl(v))
            .filter(Boolean);
    }
});

module.exports = mongoose.model("Partner", partnerSchema);