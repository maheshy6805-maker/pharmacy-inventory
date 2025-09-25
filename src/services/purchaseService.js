// services/purchaseService.js
const Purchase = require("../models/Purchase");

async function createPurchase(purchasePayload, enterpriseId) {
  const newPurchase = new Purchase({
    ...purchasePayload,
    enterprise: enterpriseId,
  });
  return await newPurchase.save();
}

module.exports = { createPurchase };
