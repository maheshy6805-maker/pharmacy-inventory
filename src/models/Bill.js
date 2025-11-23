/**
 * @swagger
 * components:
 *   schemas:
 *     BilledProduct:
 *       type: object
 *       properties:
 *         product:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             scheme:
 *               type: string
 *             packing:
 *               type: string
 *             batchNumber:
 *               type: string
 *             expiryDate:
 *               type: string
 *             price:
 *               type: number
 *             pricePerUnit:
 *               type: number
 *             discount:
 *               type: number
 *             gst:
 *               type: number
 *         quantitySold:
 *           type: number
 *         saleUnits:
 *           type: number
 *           description: Units sold (e.g. 5 tablets)
 *         salePacks:
 *           type: number
 *           description: Equivalent packs sold (e.g. 0.5 strips)
 *         unitPrice:
 *           type: number
 *         totalPrice:
 *           type: number
 *         fromMaster:
 *           type: boolean
 *         custom:
 *           type: boolean
 *
 *     Bill:
 *       type: object
 *       required:
 *         - enterprise
 *         - products
 *         - customer
 *         - totalAmount
 */

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
      costPrice: { type: Number, default: 0 },
      price: { type: Number, default: 0 }, // Pack price
      pricePerUnit: { type: Number, default: 0 }, // Unit price
      discount: { type: Number, default: 0 },
      gst: { type: Number, default: 0 },
      // Add in billedProductSchema
profit: { type: Number, default: 0 }, // per line profit

    },

    quantitySold: { type: Number, required: true }, // legacy field
    saleUnits: { type: Number, default: 0 }, // total units sold
    salePacks: { type: Number, default: 0 }, // derived packs sold
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
    // Add in billSchema
totalProfit: { type: Number, default: 0 },

    billingDate: { type: Date, default: Date.now },
    warnings: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
