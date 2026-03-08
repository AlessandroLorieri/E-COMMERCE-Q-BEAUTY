const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
            index: true,
        },

        role: {
            type: String,
            default: null,
            trim: true,
            maxlength: 80,
        },

        city: {
            type: String,
            default: null,
            trim: true,
            maxlength: 80,
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },

        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },

        approved: {
            type: Boolean,
            default: false,
            index: true,
        },

        approvedAt: {
            type: Date,
            default: null,
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        rewardCouponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Coupon",
            default: null,
        },

        rewardSentAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

ReviewSchema.index({ approved: 1, createdAt: -1 });
ReviewSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Review", ReviewSchema);