// models/Product.js
const mongoose = require("mongoose");
const { formatStockDisplay } = require("../utils/stockFormatter");

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
 *           example: Aceclo Plus Tablet
 *         brand:
 *           type: string
 *           example: Medley
 *         manufacturer:
 *           type: string
 *           example: Medley Pharma
 *         category:
 *           type: string
 *           enum: [Medicine, Cosmetic, Wellness, Personal Care, Medical Device, Supplement]
 *         subcategory:
 *           type: string
 *           example: Allopathic
 *         price:
 *           type: number
 *           example: 50
 *           description: MRP per pack
 *         costPrice:
 *           type: number
 *           example: 30
 *           description: Purchase price per pack
 *         stock:
 *           type: number
 *           example: 100
 *           description: Alias for remainingPacks (legacy)
 *         description:
 *           type: string
 *           example: NSAID tablet
 *         prescriptionRequired:
 *           type: boolean
 *           example: true
 *         image:
 *           type: object
 *           properties:
 *             url:  { type: string, example: "https://cdn.example.com/img1.png " }
 *         enterprise:
 *           type: string
 *           description: Enterprise ID reference
 */

const productSchema = new mongoose.Schema(
  {
    /* ---------- basic product data ---------- */
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
    price: { type: Number, required: true }, // MRP per pack
    costPrice: { type: Number, required: true }, // purchase price per pack
    discountPercentage: { type: Number, default: 0 },
    gstPercentage: { type: Number, default: 0 },
    cgstPercent: { type: Number, default: 0 },
    sgstPercent: { type: Number, default: 0 },
    batchNumber: { type: String },
    hsnCode: { type: String },
    scheme: { type: String },
    pack: { type: String }, // e.g. "1x10" (optional)
    measure: { type: String, default: "unit" }, // Bottle/Strip/Tube…
    expiryDate: { type: Date },
    prescriptionRequired: { type: Boolean, default: false },

    /* ---------- pack / unit configuration (USER-ENTERED) ---------- */
    packType: { type: String, default: "Strip" }, // Strip/Bottle/Box…
    packsQuantity: { type: Number, default: 0 }, // total packs bought
    unitsPerPack: { type: Number, default: 1 }, // units inside one pack
    totalUnits: { type: Number, default: 0 }, // packsQuantity * unitsPerPack
    pricePerUnit: { type: Number, default: 0 }, // selling price of 1 unit

    /* ---------- current stock (UPDATED IN REAL-TIME) ---------- */
    remainingPacks: { type: Number, default: 0 }, // full packs left
    remainingUnits: { type: Number, default: 0 }, // total units left
    remainingStock: { type: String, default: "" }, // readable string

    /* ---------- legacy aliases (kept for backward compat) ---------- */
    stock: { type: Number, required: true }, // alias for remainingPacks
    stockPacks: { type: Number, default: 0 }, // alias for remainingPacks
    stockUnits: { type: Number, default: 0 }, // alias for remainingUnits

    /* ---------- cut-selling flag ---------- */
    cutSelling: { type: Boolean, default: false },
    subUnits: { type: Number, default: 0 }, // same as unitsPerPack when cut-selling is on

    /* ---------- media ---------- */
    image: {
      url: { type: String },
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

/* ----------------------------------------------------------
   PRE-SAVE HOOK  – keeps all derived fields in perfect sync
-----------------------------------------------------------*/
productSchema.pre("save", function (next) {
  /* 1.  basic maths */
  this.totalUnits = this.packsQuantity * this.unitsPerPack;
  this.stock = this.remainingPacks; // legacy alias
  this.stockPacks = this.remainingPacks;
  this.stockUnits = this.remainingUnits;
  this.subUnits = this.unitsPerPack; // cut-selling mirror

  /* 2.  readable stock string */
  const extra = this.remainingUnits - this.remainingPacks * this.unitsPerPack;
  this.remainingStock =
    `${this.remainingPacks} ${this.packType}` +
    (extra ? ` + ${extra} units` : "");

  next();
});

/* ----------------------------------------------------------
   HELPERS  – human-readable stock text
-----------------------------------------------------------*/
productSchema.virtual("displayStock").get(function () {
  return formatStockDisplay(
    this.remainingUnits,
    this.unitsPerPack,
    this.packType,
    this.measure
  );
});

productSchema.methods.getDisplayStock = function () {
  return formatStockDisplay(
    this.remainingUnits,
    this.unitsPerPack,
    this.packType,
    this.measure
  );
};

module.exports = mongoose.model("Product", productSchema);
