// routes/billingRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const billingController = require("../controllers/customerController");

router.get("/", auth, billingController.getAllCustomers);

module.exports = router;
