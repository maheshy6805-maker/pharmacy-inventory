// controllers/purchaseBillController.js
const PurchaseBill = require("../models/PurchaseBill");
const Product = require("../models/Product");

// 1. Create Purchase Bill with products
exports.addProductsToPurchase = async (req, res) => {
  try {
    if (req.user.role !== "PHARMACIST" && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const enterpriseId = req.user.enterprise;
    const {
      supplierName,
      invoiceNumber,
      purchasedDate,
      paymentStatus = "PENDING",
      items,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const amount = item.amount || item.qnty * item.rate;
      totalAmount += amount;

      // 🔽 Create inventory product
      const newProduct = new Product({
        name: item.name,
        hsnCode: item.hsnCode,
        manufacturer: item.manufacturerName,
        batchNumber: item.batchNo,
        expiryDate: item.expiryDate,
        costPrice: item.rate,
        price: item.retailPrice,
        discountPercentage: item.discountPercent || 0,
        gstPercentage: (item.cgstPercent || 0) + (item.sgstPercent || 0),
        cgstPercent: item.cgstPercent,
        sgstPercent: item.sgstPercent,
        scheme: item.scheme,
        stock: item.qnty,
        pack: item.pack,
        category: "Medicine",
        subcategory: "NA",
        enterprise: enterpriseId,
      });

      const savedProduct = await newProduct.save();

      // 🔽 push into bill's purchased items
      processedItems.push({
        ...item,
        amount,
        product: savedProduct._id,
      });
    }

    const purchaseBill = new PurchaseBill({
      supplierName,
      invoiceNumber,
      purchasedDate: purchasedDate || Date.now(),
      totalAmount,
      paymentStatus,
      enterprise: enterpriseId,
      items: processedItems,
    });

    const savedBill = await purchaseBill.save();

    res.status(201).json({
      message: "Purchase bill created successfully",
      purchaseBill: savedBill,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error creating purchase bill",
      error: err.message,
    });
  }
};

// 2. Get all bills
exports.getAllPurchasedProducts = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;
    const bills = await PurchaseBill.find({
      enterprise: enterpriseId,
    }).populate("items.product");
    res.status(200).json({ bills });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch purchase bills", error: err.message });
  }
};

// 3. Get bill by ID
exports.getPurchasedBillById = async (req, res) => {
  try {
    const bill = await PurchaseBill.findOne({
      _id: req.params.id,
      enterprise: req.user.enterprise,
    }).populate("items.product");

    if (!bill) return res.status(404).json({ message: "Bill not found" });

    res.status(200).json({ bill });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch bill", error: err.message });
  }
};

// 4. Update bill
exports.updatePurchasedProduct = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;
    const { id } = req.params;
    const updateData = req.body;

    const updatedBill = await PurchaseBill.findOneAndUpdate(
      { _id: id, enterprise: enterpriseId },
      { $set: updateData },
      { new: true }
    ).populate("items.product");

    if (!updatedBill) {
      return res.status(404).json({ message: "Purchase bill not found" });
    }

    res
      .status(200)
      .json({ message: "Purchase bill updated", purchaseBill: updatedBill });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update bill", error: err.message });
  }
};
