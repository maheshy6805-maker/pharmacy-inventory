// routes/purchaseBillRoutes.js
const express = require("express");
const router = express.Router();
const purchaseBillController = require("../controllers/purchaseBillController");
const authMiddleware = require("../middlewares/authMiddleware");

// ➕ Add a new purchase bill with items (products)
router.post(
  "/add",
  authMiddleware,
  purchaseBillController.addProductsToPurchase
);

// 📦 Get all purchase bills
router.get("/", authMiddleware, purchaseBillController.getAllPurchasedProducts);

// 🔍 Get one purchase bill by ID
router.get("/:id", authMiddleware, purchaseBillController.getPurchasedBillById);

// ✏️ Update a purchase bill by ID
router.put(
  "/:id",
  authMiddleware,
  purchaseBillController.updatePurchasedProduct
);

router.delete(
  "/:id",
  authMiddleware,
  purchaseBillController.deletePurchasedBill
);

/**
 * @swagger
 * tags:
 *   name: PurchaseBill
 *   description: Manage purchase bills and their items
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PurchaseItem:
 *       type: object
 *       required:
 *         - name
 *         - rate
 *         - retailPrice
 *         - qnty
 *         - amount
 *       properties:
 *         name:
 *           type: string
 *           example: "Paracetamol 500mg"
 *         hsnCode:
 *           type: string
 *           example: "3004"
 *         manufacturerName:
 *           type: string
 *           example: "Cipla Ltd"
 *         batchNo:
 *           type: string
 *           example: "B12345"
 *         expiryDate:
 *           type: string
 *           format: date
 *           example: "2026-05-01"
 *         rate:
 *           type: number
 *           example: 45
 *         retailPrice:
 *           type: number
 *           example: 55
 *         discountPercent:
 *           type: number
 *           example: 10
 *         scheme:
 *           type: string
 *           example: "Buy 10 Get 1"
 *         cgstPercent:
 *           type: number
 *           example: 6
 *         sgstPercent:
 *           type: number
 *           example: 6
 *         qnty:
 *           type: number
 *           example: 20
 *         pack:
 *           type: string
 *           example: "10x10"
 *         amount:
 *           type: number
 *           example: 900
 *         product:
 *           type: string
 *           description: Reference to product ID
 *           example: "6710b6e5f02b51b44d4d1a7e"
 *
 *     PurchaseBill:
 *       type: object
 *       required:
 *         - supplierName
 *         - items
 *         - enterprise
 *       properties:
 *         _id:
 *           type: string
 *           example: "6720a6b5c0a5f43a4b8d1234"
 *         purchaseBillName:
 *           type: string
 *           example: "Invoice #123"
 *         supplierName:
 *           type: string
 *           example: "ABC Pharma Distributors"
 *         purchasedDate:
 *           type: string
 *           format: date
 *           example: "2025-10-20"
 *         totalAmount:
 *           type: number
 *           example: 15000
 *         enterprise:
 *           type: string
 *           example: "66f09d29a4b6a5a3e1d0b9f2"
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PurchaseItem'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/purchase/add:
 *   post:
 *     summary: Create a new purchase bill with items
 *     tags: [PurchaseBill]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supplierName
 *               - items
 *             properties:
 *               supplierName:
 *                 type: string
 *                 example: "Cipla Distributors"
 *               invoiceNumber:
 *                 type: string
 *                 example: "INV-2025-1001"
 *               purchasedDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-25"
 *               paymentStatus:
 *                 type: string
 *                 enum: [PAID, PENDING]
 *                 example: "PENDING"
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/PurchaseItem'
 *     responses:
 *       201:
 *         description: Purchase bill created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Purchase bill created successfully"
 *                 purchaseBill:
 *                   $ref: '#/components/schemas/PurchaseBill'
 *       400:
 *         description: Missing or invalid data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Error creating purchase bill
 */

/**
 * @swagger
 * /api/purchase:
 *   get:
 *     summary: Get all purchase bills for the logged-in enterprise
 *     tags: [PurchaseBill]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all purchase bills
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bills:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PurchaseBill'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch purchase bills
 */

/**
 * @swagger
 * /api/purchase/{id}:
 *   get:
 *     summary: Get details of a purchase bill by ID
 *     tags: [PurchaseBill]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase bill ID
 *     responses:
 *       200:
 *         description: Purchase bill details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bill:
 *                   $ref: '#/components/schemas/PurchaseBill'
 *       404:
 *         description: Bill not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch bill
 */

/**
 * @swagger
 * /api/purchase/{id}:
 *   put:
 *     summary: Update an existing purchase bill
 *     tags: [PurchaseBill]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Purchase bill ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseBill'
 *     responses:
 *       200:
 *         description: Purchase bill updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Purchase bill updated"
 *                 purchaseBill:
 *                   $ref: '#/components/schemas/PurchaseBill'
 *       404:
 *         description: Purchase bill not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to update bill
 */

module.exports = router;
