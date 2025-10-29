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
 *               example: "66f0b4c8e4f9b5c8b2a8a1b2"
 *             name:
 *               type: string
 *               example: "Paracetamol 500mg"
 *             scheme:
 *               type: string
 *               example: "Buy 10 Get 1"
 *             packing:
 *               type: string
 *               example: "10x10"
 *             batchNumber:
 *               type: string
 *               example: "B12345"
 *             expiryDate:
 *               type: string
 *               example: "2026-05"
 *             price:
 *               type: number
 *               example: 50
 *             discount:
 *               type: number
 *               example: 10
 *             gst:
 *               type: number
 *               example: 12
 *         quantitySold:
 *           type: number
 *           example: 2
 *         unitPrice:
 *           type: number
 *           example: 50
 *         totalPrice:
 *           type: number
 *           example: 100
 *         fromMaster:
 *           type: boolean
 *           example: false
 *         custom:
 *           type: boolean
 *           example: false
 *
 *     Bill:
 *       type: object
 *       required:
 *         - enterprise
 *         - products
 *         - customer
 *         - totalAmount
 *       properties:
 *         _id:
 *           type: string
 *           example: "6710b6e5f02b51b44d4d1a7e"
 *         enterprise:
 *           type: string
 *           description: Enterprise ID reference
 *           example: "66f09d29a4b6a5a3e1d0b9f2"
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BilledProduct'
 *         customer:
 *           type: string
 *           description: Customer ID reference
 *           example: "66f09d40a4b6a5a3e1d0b9f3"
 *         totalAmount:
 *           type: number
 *           example: 1200
 *         prescribingDoctor:
 *           type: string
 *           example: "Dr. Mehta"
 *         paymentMode:
 *           type: string
 *           enum: [Cash, UPI, Card, Debt]
 *           example: "UPI"
 *         billFileUrl:
 *           type: string
 *           example: "https://cdn.pharmalogy.com/bills/6710b6e5f02b51b44d4d1a7e.pdf"
 *         billType:
 *           type: string
 *           enum: [FROM_STOCK, FROM_MASTER, CUSTOM]
 *           example: "FROM_STOCK"
 *         warnings:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Negative billing detected for Paracetamol"]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
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
