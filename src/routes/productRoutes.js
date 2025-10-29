/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management APIs
 */

const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/productController");
const auth = require("../middlewares/authMiddleware");

/**
 * @swagger
 * /api/products/add:
 *   post:
 *     summary: Add one or multiple products
 *     description: Add a single product or an array of products (for bulk insert)
 *     tags:
 *       - Products
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/Product'
 *               - type: object
 *                 properties:
 *                   products:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Product'
 *           examples:
 *             singleProduct:
 *               summary: Add a single product
 *               value:
 *                 name: "Paracetamol 500mg"
 *                 brand: "Crocin"
 *                 manufacturer: "GSK Pharma"
 *                 category: "Medicine"
 *                 subcategory: "Allopathic"
 *                 description: "Pain relief tablet"
 *                 price: 50
 *                 costPrice: 30
 *                 stock: 100
 *                 prescriptionRequired: true
 *             multipleProducts:
 *               summary: Add multiple products
 *               value:
 *                 products:
 *                   - name: "Vitamin C Tablets"
 *                     category: "Supplement"
 *                     price: 120
 *                     costPrice: 90
 *                     stock: 50
 *                   - name: "Cough Syrup"
 *                     category: "Medicine"
 *                     price: 80
 *                     costPrice: 50
 *                     stock: 20
 *     responses:
 *       201:
 *         description: Product(s) added successfully
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Unauthorized
 */
router.post("/add", auth, productCtrl.addProduct);

router.post("/add", auth, productCtrl.addProduct);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with pagination and filters
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated list of products
 */
router.get("/", auth, productCtrl.getAllProducts);

/**
 * @swagger
 * /api/products/masterProducts:
 *   get:
 *     summary: Get all master products
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         description: Search by product name
 *     responses:
 *       200:
 *         description: List of master products
 */
router.get("/masterProducts", auth, productCtrl.getAllMasterProducts);

/**
 * @swagger
 * /api/products/{id}/update:
 *   put:
 *     summary: Update product details
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put("/:id/update", auth, productCtrl.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product by ID
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete("/:id", auth, productCtrl.deleteProduct);

module.exports = router;
