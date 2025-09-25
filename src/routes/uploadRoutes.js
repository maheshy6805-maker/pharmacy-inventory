const express = require("express");
const multer = require("multer");
const { parseCSV } = require("../utils/csvNative");
const { processCsvAndInsert } = require("../utils/csvHandler");
const auth = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer(); // memory storage
const { createProduct } = require("../services/productService");
const { createPurchase } = require("../services/purchaseService");

/* --------- 1.  READ HEADERS ONLY (native parser) --------- */
router.post("/map", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const text = req.file.buffer.toString("utf8");
    const data = parseCSV(text); // <-- native parser
    const headers = Object.keys(data[0] || {});
    res.json({ headers });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* --------- 2.  IMPORT AFTER MAPPING (no parser needed) --------- */
// routes/uploadRoutes.js

router.post("/import", async (req, res) => {
  try {
    const { rows } = req.body;
    const enterpriseId = req.user.enterprise;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows provided" });
    }

    let productsAdded = 0;
    let purchasesAdded = 0;
    let failed = [];

    for (const raw of rows) {
      try {
        // build product payload
        const productPayload = {
          name: raw.name,
          brand: raw.company,
          manufacturer: raw.company,
          category: "Medicine",
          subcategory: "NA",
          description: "",
          price: Number(raw.srate) || 0,
          costPrice: Number(raw.ftrate) || 0,
          stock: Number(raw.qty) || 0,
          batchNumber: raw.batch,
          expiryDate: raw.expiry ? new Date(raw.expiry) : null,
          enterprise: enterpriseId,
        };

        const product = await createProduct(productPayload, enterpriseId);

        // build purchase payload
        const purchasePayload = {
          product: product._id,
          name: raw.name,
          brand: raw.company,
          batchNumber: raw.batch,
          quantity: Number(raw.qty) || 0,
          costPrice: Number(raw.ftrate) || 0,
          price: Number(raw.srate) || 0,
          expiryDate: raw.expiry ? new Date(raw.expiry) : null,
          purchasedDate: new Date(),
          supplier: raw.supplier || "Unknown",
          enterprise: enterpriseId,
        };

        await createPurchase(purchasePayload, enterpriseId);

        productsAdded++;
        purchasesAdded++;
      } catch (err) {
        failed.push({ row: raw, error: err.message });
      }
    }

    res.json({
      message: "CSV processed successfully",
      productsAdded,
      purchasesAdded,
      failedCount: failed.length,
      failed,
    });
  } catch (err) {
    console.error("CSV Import Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

module.exports = router;
