// models/PurchaseBill.js
const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hsnCode: { type: String },
  manufacturerName: { type: String },
  batchNo: { type: String },
  expiryDate: { type: Date },
  rate: { type: Number, required: true }, // cost price
  retailPrice: { type: Number, required: true }, // selling price
  discountPercent: { type: Number, default: 0 },
  scheme: { type: String },
  cgstPercent: { type: Number, default: 0 },
  sgstPercent: { type: Number, default: 0 },
  qnty: { type: Number, required: true },
  pack: { type: String },
  amount: { type: Number, required: true }, // computed: qnty * rate or retailPrice
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
});

const purchaseBillSchema = new mongoose.Schema(
  {
    purchaseBillName: { type: String },
    supplierName: { type: String },
    purchasedDate: { type: Date, default: Date.now },
    totalAmount: { type: Number, default: 0 },
    enterprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enterprise",
      required: true,
    },
    items: [purchaseItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseBill", purchaseBillSchema);
