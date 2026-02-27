const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
    {
        productId: { type: String, required: true, unique: true, trim: true, index: true },

        sortOrder: { type: Number, default: 9999, min: 0, index: true },

        name: { type: String, required: true, trim: true },

        priceCents: { type: Number, required: true, min: 0 },

        compareAtPriceCents: { type: Number, default: null, min: 0 },

        stockQty: { type: Number, required: true, min: 0, default: 0, index: true },

        imageUrl: { type: String, default: null, trim: true },
        galleryImageUrls: { type: [{ type: String, trim: true }], default: [] },
        shortDesc: { type: String, default: null, trim: true },
        description: { type: String, default: null, trim: true },
        howTo: { type: [String], default: [] },
        ingredients: { type: [String], default: [] },

        badge: {
            enabled: { type: Boolean, default: false },
            privateText: { type: String, default: null, trim: true },
            pivaText: { type: String, default: null, trim: true },

            bgColor: { type: String, default: null, trim: true },
            textColor: { type: String, default: null, trim: true },
        },

        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);


