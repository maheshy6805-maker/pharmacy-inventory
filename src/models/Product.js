const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String },
    manufacturer: { type: String },
    category: {
      type: String,
      enum: [
        "Medicine",
        "Cosmetic",
        "Wellness",
        "Personal Care",
        "Medical Device",
        "Supplement",
      ],
      required: true,
    },
    subcategory: {
      type: String,
      enum: [
        "Allopathic",
        "Ayurvedic",
        "Homeopathic",
        "Organic",
        "Generic",
        "NA",
      ],
      default: "NA",
    },
    salt: { type: String },
    description: { type: String },
    price: { type: Number, required: true }, // Selling price for full unit (e.g. strip)
    costPrice: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    gstPercentage: { type: Number, default: 0 },
    batchNumber: { type: String },
    unit: { type: String, default: "unit" },
    stock: { type: Number, required: true },
    prescriptionRequired: { type: Boolean, default: false },
    expiryDate: { type: Date },

    // 🔽 Cut selling additions
    cutSelling: { type: Boolean, default: false },
    subUnits: { type: Number, default: 0 }, // E.g. 10 tablets in a strip
    pricePerUnit: { type: Number, default: 0 },

    enterprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enterprise",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
