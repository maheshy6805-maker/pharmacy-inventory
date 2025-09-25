// services/productService.js
const Product = require("../models/Product");

async function createProduct(productPayload, enterpriseId) {
  const newProduct = new Product({
    ...productPayload,
    enterprise: enterpriseId,
  });
  return await newProduct.save();
}

module.exports = { createProduct };
