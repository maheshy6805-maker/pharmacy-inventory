// models/PurchaseBill.js
const mongoose = require("mongoose");

// models/PurchaseBill.js
const purchaseItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hsnCode: String,
  manufacturerName: String,
  batchNo: String,
  expiryDate: Date,
  retailPrice: { type: Number, required: true },
  discountPercent: { type: Number, default: 0 },
  scheme: String,
  cgstPercent: { type: Number, default: 0 },
  sgstPercent: { type: Number, default: 0 },
  qnty: { type: Number, required: true },
  amount: { type: Number, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },

  // ⬇️⬇️⬇️  NEW
  // models/Product.js  (only new/changed lines)
  packType: { type: String, default: "Strip" }, // Bottle/Tube/Box …
  packsQuantity: { type: Number, default: 0 }, // total packs bought
  unitsPerPack: { type: Number, default: 1 }, // units in one pack
  totalUnits: { type: Number, default: 0 }, // packsQuantity * unitsPerPack
  remainingPacks: { type: Number, default: 0 }, // full packs left
  remainingUnits: { type: Number, default: 0 }, // total units left
  remainingStock: { type: String, default: "" }, // readable string
  // 🧩 Stock tracking
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
