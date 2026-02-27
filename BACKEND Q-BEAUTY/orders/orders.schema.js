const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
    {
        productId: { type: String, required: true, trim: true },

        productRef: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
        productSlug: { type: String, trim: true, default: null },
        couponDiscountCents: { type: Number, required: true, min: 0, default: 0 },

        name: { type: String, required: true, trim: true },
        unitPriceCents: { type: Number, required: true, min: 0 },
        qty: { type: Number, required: true, min: 1 },
        lineTotalCents: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const ShippingAddressSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, default: "" },
        surname: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        email: { type: String, trim: true, lowercase: true, default: "" },
        address: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        cap: { type: String, trim: true, default: "" },
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

        publicId: { type: String, default: null, index: true, unique: true, sparse: true },

        status: {
            type: String,
            enum: [
                "draft",
                "pending_payment",
                "paid",
                "processing",
                "shipped",
                "completed",
                "cancelled",
                "refunded",
            ],

            default: "pending_payment",
            index: true,
        },

        items: { type: [OrderItemSchema], default: [] },

        shippingAddress: { type: ShippingAddressSchema, default: null },

        shippingAddressRef: { type: mongoose.Schema.Types.ObjectId, ref: "Address", default: null },

        subtotalCents: { type: Number, required: true, min: 0, default: 0 },
        discountCents: { type: Number, required: true, min: 0, default: 0 },

        couponCodeApplied: { type: String, trim: true, uppercase: true, default: null, index: true },
        couponDiscountCents: { type: Number, required: true, min: 0, default: 0 },
        globalDiscountCents: { type: Number, required: true, min: 0, default: 0 },

        discountLabel: { type: String, default: null },
        shippingCents: { type: Number, required: true, min: 0, default: 0 },
        totalCents: { type: Number, required: true, min: 0, default: 0 },

        shipment: {
            carrierName: { type: String, trim: true, default: "" },
            trackingCode: { type: String, trim: true, default: "" },
            trackingUrl: { type: String, trim: true, default: "" },
            shippedAt: { type: Date, default: null },
            notifiedAt: { type: Date, default: null }, 
        },

        discountType: { type: String, enum: ["none", "piva15", "first10"], default: "none" },
    },
    { timestamps: true }
);

OrderSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
