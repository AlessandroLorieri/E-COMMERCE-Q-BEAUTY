const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

        label: { type: String, trim: true, default: "" },
        isDefault: { type: Boolean, default: false, index: true },

        name: { type: String, trim: true, default: "" },
        surname: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        email: { type: String, trim: true, lowercase: true, default: "" },

        address: { type: String, trim: true, default: "" },
        streetNumber: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        cap: { type: String, trim: true, default: "" },
    },
    { timestamps: true }
);

AddressSchema.index({ user: 1, isDefault: 1 });

module.exports = mongoose.model("Address", AddressSchema);
