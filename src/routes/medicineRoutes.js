const express = require("express");
const router = express.Router();
const { getAllMedicines } = require("../controllers/medicineController");

router.get("/", getAllMedicines);

module.exports = router;
