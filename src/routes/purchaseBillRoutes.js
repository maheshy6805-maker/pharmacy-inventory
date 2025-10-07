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

module.exports = router;
