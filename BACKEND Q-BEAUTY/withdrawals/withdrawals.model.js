
const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
        },

        orderNumber: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },

        products: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },

        declaration: {
            type: String,
            required: true,
            default: "Comunico la mia volontà di recedere dal contratto di acquisto.",
        },

        receivedAt: {
            type: Date,
            required: true,
            default: Date.now,
            immutable: true,
        },

        customerEmailSentAt: {
            type: Date,
            default: null,
        },

        adminEmailSentAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "withdrawals",
    }
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
