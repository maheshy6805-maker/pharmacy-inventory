const mongoose = require("mongoose");

const billedProductSchema = new mongoose.Schema(
  {
    product: {
      _id: { type: String }, // Can be ObjectId, MASTER-xxx, or CUSTOM-xxx
      name: { type: String, required: true },
      scheme: { type: String },
      packing: { type: String },
      batchNumber: { type: String },
      expiryDate: { type: String },
      price: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      gst: { type: Number, default: 0 },
    },

    quantitySold: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },

    fromMaster: { type: Boolean, default: false },
    custom: { type: Boolean, default: false },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    enterprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enterprise",
      required: true,
    },
    products: [billedProductSchema],
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    totalAmount: { type: Number, required: true },
    prescribingDoctor: { type: String },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Debt"],
      default: "Cash",
    },
    billFileUrl: { type: String },
    billType: {
      type: String,
      enum: ["FROM_STOCK", "FROM_MASTER", "CUSTOM"],
      default: "FROM_STOCK",
    },
    warnings: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
