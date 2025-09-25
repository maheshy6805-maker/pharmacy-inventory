// utils/csvHandler.js
const Papa = require("papaparse");
const { createProduct } = require("../services/productService");
const { createPurchase } = require("../services/purchaseService");

const toNumber = (val, fallback = 0) => {
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

async function processCsvAndInsert(csvText, enterpriseId) {
  // csvText is already a string – parse it directly
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data;

  let productsAdded = 0;
  let purchasesAdded = 0;
  const failed = [];

  for (const rawRow of rows) {
    const row = {};
    for (let k in rawRow) {
      const cleanKey = k.toLowerCase().replace(/\s+/g, ""); // remove ALL spaces
      row[cleanKey] = rawRow[k]?.toString().trim() || "";
    }

    console.log("🔍 itemname:", row.itemname);

    try {
      const productPayload = {
        name: row.itemname, // ← real key after space-strip
        brand: row.company, // COMPANY column
        manufacturer: row.company,
        salt: row.salt,
        category: row.category || "Medicine",
        subcategory: row.subcategory || "Allopathic",
        description: row.description || "",
        price: toNumber(row.srate), // selling rate
        costPrice: toNumber(row.ftrate), // trade rate
        stock: toNumber(row.qty),
      };

      const product = await createProduct(productPayload, enterpriseId);

      const purchasePayload = {
        product: product._id,
        name: row.itemname, // ← REQUIRED field for Purchase model
        batchNumber: row.batch,
        quantity: toNumber(row.qty),
        unit: row.unit || "strip",
        costPrice: toNumber(row.ftrate),
        price: toNumber(row.srate),
        discountPercentage: toNumber(row.dis),
        gstPercentage: toNumber(row.cgst) + toNumber(row.sgst),
        expiryDate: row.expiry ? new Date(row.expiry) : null,
        purchasedDate: new Date(),
        supplier: row.supplier || "Unknown", // safer fallback
      };

      await createPurchase(purchasePayload, enterpriseId);

      productsAdded++;
      purchasesAdded++;
    } catch (err) {
      failed.push({ row: rawRow, error: err.message });
    }
  }

  return {
    message: "CSV processed successfully",
    productsAdded,
    purchasesAdded,
    failedCount: failed.length,
    failed,
  };
}

module.exports = { processCsvAndInsert };
