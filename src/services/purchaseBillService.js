const PurchaseBill = require("../models/PurchaseBill");

async function createPurchaseBill(purchaseBillPayload, enterpriseId) {
  const newPurchaseBill = new PurchaseBill({
    ...purchaseBillPayload,
    enterprise: enterpriseId,
  });
  return await newPurchaseBill.save();
}

module.exports = { createPurchaseBill };
