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
        quantitySold: Number,
        unitPrice: Number,
        totalPrice: Number,
      },
    ],
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    totalAmount: Number,
    prescribingDoctor: { type: String },

    // 💳 Payment mode field
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Debt"],
      default: "Cash",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
