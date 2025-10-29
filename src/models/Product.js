// models/Product.js

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - price
 *         - costPrice
 *         - stock
 *       properties:
 *         name:
 *           type: string
 *           example: Paracetamol 500mg
 *         brand:
 *           type: string
 *           example: Crocin
 *         manufacturer:
 *           type: string
 *           example: GSK Pharma
 *         category:
 *           type: string
 *           enum: [Medicine, Cosmetic, Wellness, Personal Care, Medical Device, Supplement]
 *         subcategory:
 *           type: string
 *           example: Allopathic
 *         price:
 *           type: number
 *           example: 50
 *         costPrice:
 *           type: number
 *           example: 30
 *         stock:
 *           type: number
 *           example: 100
 *         description:
 *           type: string
 *           example: Pain relief tablet
 *         prescriptionRequired:
 *           type: boolean
 *           example: true
 *         image:
 *           type: object
 *           properties:
 *             url: { type: string, example: "https://cdn.example.com/img1.png" }
 *         enterprise:
 *           type: string
 *           description: Enterprise ID reference
 */

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

    // in models/Product.js (inside schema fields)
    hsnCode: { type: String },
    scheme: { type: String },
    cgstPercent: { type: Number, default: 0 },
    sgstPercent: { type: Number, default: 0 },
    pack: { type: String },

    // 🔽 New image field
    image: {
      url: { type: String, required: false },
      key: { type: String },
      name: { type: String },
      size: { type: Number },
      type: { type: String },
    },

    enterprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enterprise",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
