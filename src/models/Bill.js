// models/Bill.js
const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    enterprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enterprise",
      required: true,
    },
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        subUnitsPurchased: Number, // Only used if cutSelling is true
        unitPrice: Number,
        totalPrice: Number,
      },
    ],
    totalAmount: Number,
    discountAmount: Number,
    finalAmount: Number,
    isBillOnDebt: { type: Boolean, default: false },
    customerName: { type: String },
    prescribingDoctor: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
