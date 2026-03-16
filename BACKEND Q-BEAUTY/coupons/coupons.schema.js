const mongoose = require("mongoose");

const CouponRuleSchema = new mongoose.Schema(
    {
        productId: { type: String, required: true, trim: true },

        type: { type: String, enum: ["percent", "fixed"], required: true },
        value: { type: Number, required: true },
    },
    { _id: false }
);

const CouponSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, trim: true, uppercase: true, maxlength: 32, unique: true, index: true },
        name: { type: String, default: null, trim: true, maxlength: 80 },

        isActive: { type: Boolean, default: true, index: true },
        startsAt: { type: Date, default: null },
        endsAt: { type: Date, default: null },

        maxUses: {
            type: Number,
            default: null,
            min: 1,
        },

        usedCount: {
            type: Number,
            default: 0,
            min: 0,
        },

        rules: { type: [CouponRuleSchema], default: [] },

        ownerUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        sourceReview: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review",
            default: null,
            index: true,
        },

        isRewardCoupon: {
            type: Boolean,
            default: false,
            index: true,
        },

        usedAt: {
            type: Date,
            default: null,
        },

        usedByOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },

        usedByUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Coupon", CouponSchema);