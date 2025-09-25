// routes/purchaseRoutes.js
const express = require("express");
const router = express.Router();
const purchaseController = require("../controllers/purchaseController");

// Add multiple products to purchase
router.post("/add", purchaseController.addProductsToPurchase);

// Get all purchased products
router.get("/", purchaseController.getAllPurchasedProducts);

// Update a purchased product by ID
router.put("/:id", purchaseController.updatePurchasedProduct);

module.exports = router;
