// routes/billingRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const billingController = require("../controllers/billingController");

router.post("/generate", auth, billingController.generateBill);
router.get("/", auth, billingController.getAllBills);
router.put("/:id", auth, billingController.updateBill);
router.patch(
  "/payment-received",
  auth,
  billingController.updatePaymentReceived
);

module.exports = router;
