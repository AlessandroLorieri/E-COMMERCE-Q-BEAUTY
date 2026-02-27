const mongoose = require("mongoose");

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

        companyName: { type: String, trim: true },
        vatNumber: { type: String, trim: true },

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
