const mongoose = require("mongoose");

const shopSettingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        shippingCents: {
            type: Number,
            required: true,
            min: 0,
            default: 700,
        },

        freeShippingThresholdCents: {
            type: Number,
            required: true,
            min: 0,
            default: 12000,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model("ShopSettings", shopSettingsSchema);