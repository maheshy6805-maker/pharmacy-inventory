const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", // links back to the Product collection
      required: true,
    },
    name: { type: String, required: true },
    brand: { type: String },
    manufacturer: { type: String },
    batchNumber: { type: String },
    quantity: { type: Number, required: true }, // Purchased quantity
    unit: { type: String, default: "unit" },

    costPrice: { type: Number, required: true },
    price: { type: Number, required: true }, // Selling price
    discountPercentage: { type: Number, default: 0 },
    gstPercentage: { type: Number, default: 0 },

    expiryDate: { type: Date },
    purchasedDate: { type: Date, default: Date.now }, // When purchase was made

    supplier: { type: String }, // If supplier info available

    enterprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enterprise",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Purchase", purchaseSchema);
