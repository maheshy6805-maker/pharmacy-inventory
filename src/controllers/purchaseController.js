// controllers/purchaseController.js
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");

exports.addProductsToPurchase = async (req, res) => {
  try {
    if (req.user.role !== "PHARMACIST" && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const enterpriseId = req.user.enterprise;
    const { products } = req.body; // array of product objects

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "No products provided" });
    }

    const createdPurchases = [];

    for (const p of products) {
      // Create product in Product collection
      const newProduct = new Product({
        name: p.name,
        brand: p.brand,
        manufacturer: p.manufacturer,
        category: p.category || "Medicine",
        subcategory: p.subcategory || "NA",
        salt: p.salt,
        description: p.description,
        price: p.price,
        costPrice: p.costPrice,
        discountPercentage: p.discountPercentage || 0,
        gstPercentage: p.gstPercentage || 0,
        batchNumber: p.batchNumber,
        unit: p.unit || "unit",
        stock: p.quantity,
        prescriptionRequired: p.prescriptionRequired || false,
        expiryDate: p.expiryDate,
        cutSelling: p.cutSelling || false,
        subUnits: p.subUnits || 0,
        pricePerUnit: p.pricePerUnit || 0,
        enterprise: enterpriseId,
      });

      const savedProduct = await newProduct.save();

      // Create purchase entry
      const newPurchase = new Purchase({
        product: savedProduct._id,
        name: p.name,
        brand: p.brand,
        manufacturer: p.manufacturer,
        batchNumber: p.batchNumber,
        quantity: p.quantity,
        unit: p.unit || "unit",
        costPrice: p.costPrice,
        price: p.price,
        discountPercentage: p.discountPercentage || 0,
        gstPercentage: p.gstPercentage || 0,
        expiryDate: p.expiryDate,
        purchasedDate: p.purchasedDate || Date.now(),
        supplier: p.supplier,
        enterprise: enterpriseId,
      });

      const savedPurchase = await newPurchase.save();
      createdPurchases.push(savedPurchase);
    }

    res.status(201).json({
      message: "Products purchased successfully",
      purchases: createdPurchases,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error purchasing products", error: err.message });
  }
};

exports.getAllPurchasedProducts = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;

    const purchases = await Purchase.find({
      enterprise: enterpriseId,
    }).populate("product");

    res.status(200).json({ purchases });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch purchases", error: err.message });
  }
};

exports.updatePurchasedProduct = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;
    const { id } = req.params;
    const updateData = req.body;

    const purchase = await Purchase.findOneAndUpdate(
      { _id: id, enterprise: enterpriseId },
      { $set: updateData },
      { new: true }
    );

    if (!purchase) {
      return res.status(404).json({ message: "Purchased product not found" });
    }

    res.status(200).json({ message: "Purchase updated", purchase });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update purchase", error: err.message });
  }
};
