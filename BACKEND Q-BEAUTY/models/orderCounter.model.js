const mongoose = require("mongoose");

const orderCounterSchema = new mongoose.Schema(
    {
        year: { type: Number, required: true, unique: true },
        seq: { type: Number, required: true, default: 99 }, 
    },
    { timestamps: true }
);

module.exports = mongoose.model("OrderCounter", orderCounterSchema);
