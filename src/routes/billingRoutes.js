// routes/billingRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const billingController = require("../controllers/billingController");

router.post("/generate", auth, billingController.generateBill);

module.exports = router;
