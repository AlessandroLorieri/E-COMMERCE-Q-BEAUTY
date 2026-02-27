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

        rules: { type: [CouponRuleSchema], default: [] },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Coupon", CouponSchema);
