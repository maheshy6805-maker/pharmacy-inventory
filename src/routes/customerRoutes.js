// routes/billingRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const billingController = require("../controllers/customerController");

router.get("/", auth, billingController.getAllCustomers);

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Manage pharmacy customers
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - name
 *         - mobile
 *         - enterprise
 *       properties:
 *         _id:
 *           type: string
 *           example: "6720b6c8e4f9b5c8b2a8a1d2"
 *         enterprise:
 *           type: string
 *           description: Enterprise ID reference
 *           example: "66f09d29a4b6a5a3e1d0b9f2"
 *         name:
 *           type: string
 *           example: "Rahul Sharma"
 *         mobile:
 *           type: string
 *           example: "9876543210"
 *         email:
 *           type: string
 *           example: "rahul.sharma@example.com"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers with pagination and optional filters
 *     tags: [Customers]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter customers by name (partial match)
 *       - in: query
 *         name: mobile
 *         schema:
 *           type: string
 *         description: Filter customers by mobile number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Paginated list of customers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalItems:
 *                   type: integer
 *                   example: 45
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch customers
 */

module.exports = router;
