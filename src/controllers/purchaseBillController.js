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
// 2. Get all purchase bills with search + latest first + date filters
// 2. Get all purchase bills with search + latest first + date filters
exports.getAllPurchasedProducts = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;
    const {
      search, // search keyword
      startDate, // optional start date
      endDate, // optional end date
      page = 1, // pagination page (default 1)
      limit = 10, // pagination limit (default 10)
    } = req.query;

    const filters = { enterprise: enterpriseId };

    // 🟢 Search by supplierName or item name (case-insensitive)
    if (search) {
      const regex = new RegExp(search, "i");
      filters.$or = [{ supplierName: regex }, { "items.name": regex }];
    }

    // 🗓️ Filter by purchase date range
    if (startDate || endDate) {
      filters.purchasedDate = {};
      if (startDate) filters.purchasedDate.$gte = new Date(startDate);
      if (endDate) filters.purchasedDate.$lte = new Date(endDate);
    }

    // 🔹 Pagination setup
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 🔹 Fetch bills (latest first)
    const bills = await PurchaseBill.find(filters)
      .populate("items.product")
      .sort({ purchasedDate: -1, createdAt: -1 }) // latest first
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await PurchaseBill.countDocuments(filters);

    res.status(200).json({
      message: "Purchase bills fetched successfully",
      totalCount,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / limit),
      bills,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch purchase bills",
      error: err.message,
    });
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
