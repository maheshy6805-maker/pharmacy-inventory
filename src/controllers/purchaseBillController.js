// controllers/purchaseBillController.js
const PurchaseBill = require("../models/PurchaseBill");
const Product = require("../models/Product");

// 1️⃣ Create Purchase Bill with products
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

      // 🧩 Parse pack size — e.g. "1x10" → 10 units per pack
      let subUnits = 1;
      if (item.pack && item.pack.includes("x")) {
        const parts = item.pack.split("x").map(Number);
        if (!isNaN(parts[1])) subUnits = parts[1];
      }

      // 🧮 Compute price per unit and total units in stock
      const stockPacks = Number(item.qnty);
      const stockUnits = stockPacks * subUnits;
      const pricePerUnit =
        Number(item.retailPrice) && subUnits > 0
          ? Number(item.retailPrice) / subUnits
          : Number(item.retailPrice);

      // Create inventory product (stock-level entry)
      // inside addProductsToPurchase loop — create inventory product (stock-level entry)
      const parsedPackType =
        item.packType || item.pack?.split("x")[0] || "unit"; // use left side as descriptive type e.g. "Strip"
      const parsedUnitsPerPack = Number(item.subUnits) || subUnits || 1;
      const parsedPacksQuantity = Number(item.qnty) || 0;
      const parsedTotalUnits = parsedPacksQuantity * parsedUnitsPerPack;

      const newProduct = new Product({
        name: item.name,
        hsnCode: item.hsnCode,
        manufacturer: item.manufacturerName,
        batchNumber: item.batchNo,
        expiryDate: item.expiryDate,
        costPrice: Number(item.rate),
        price: Number(item.retailPrice),
        discountPercentage: Number(item.discountPercent || 0),
        gstPercentage:
          Number(item.cgstPercent || 0) + Number(item.sgstPercent || 0),
        cgstPercent: Number(item.cgstPercent || 0),
        sgstPercent: Number(item.sgstPercent || 0),
        scheme: item.scheme,

        // canonical pack/unit fields (important)
        packType: parsedPackType, // e.g. "Strip", "Bottle"
        packsQuantity: parsedPacksQuantity,
        unitsPerPack: parsedUnitsPerPack,
        totalUnits: parsedTotalUnits,

        // runtime remaining values (start equal to purchased amounts)
        remainingPacks: parsedPacksQuantity,
        remainingUnits: parsedTotalUnits,

        // legacy aliases (kept for backward compat)
        stock: parsedPacksQuantity,
        stockPacks: parsedPacksQuantity,
        stockUnits: parsedTotalUnits,

        pack: item.pack,
        subUnits: parsedUnitsPerPack, // mirror
        pricePerUnit: Number(item.pricePerUnit) || pricePerUnit,

        measure: item.measure || "unit",
        category: "Medicine",
        subcategory: "NA",
        enterprise: enterpriseId,
      });

      const savedProduct = await newProduct.save();

      // inside addProductsToPurchase (controller)
      // inside addProductsToPurchase (controller)
      processedItems.push({
        ...item, // keep whatever extra the UI sent
        amount,
        product: savedProduct._id,

        /* ⬇️  overwrite with the values you just used for the Product doc */
        packType: parsedPackType,
        packsQuantity: parsedPacksQuantity,
        unitsPerPack: parsedUnitsPerPack,
        totalUnits: parsedTotalUnits,
        remainingPacks: parsedPacksQuantity,
        remainingUnits: parsedTotalUnits,
        remainingStock: `${parsedPacksQuantity} ${parsedPackType}`, // optional nice string
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
    console.error("❌ Error creating purchase bill:", err);
    res.status(500).json({
      message: "Error creating purchase bill",
      error: err.message,
    });
  }
};

// 2️⃣ Get all purchase bills
exports.getAllPurchasedProducts = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;
    const { search, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filters = { enterprise: enterpriseId };

    if (search) {
      const regex = new RegExp(search, "i");
      filters.$or = [{ supplierName: regex }, { "items.name": regex }];
    }

    if (startDate || endDate) {
      filters.purchasedDate = {};
      if (startDate) filters.purchasedDate.$gte = new Date(startDate);
      if (endDate) filters.purchasedDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bills = await PurchaseBill.find(filters)
      .populate("items.product")
      .sort({ purchasedDate: -1, createdAt: -1 })
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

// 3️⃣ Get bill by ID
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

// 4️⃣ Update purchase bill
exports.updatePurchasedProduct = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;
    const { id } = req.params;
    const { supplierName, invoiceNumber, purchasedDate, paymentStatus, items } =
      req.body;

    const purchaseBill = await PurchaseBill.findOne({
      _id: id,
      enterprise: enterpriseId,
    }).populate("items.product");

    if (!purchaseBill) {
      return res.status(404).json({ message: "Purchase bill not found" });
    }

    if (supplierName) purchaseBill.supplierName = supplierName;
    if (invoiceNumber) purchaseBill.invoiceNumber = invoiceNumber;
    if (purchasedDate) purchaseBill.purchasedDate = purchasedDate;
    if (paymentStatus) purchaseBill.paymentStatus = paymentStatus;

    let totalAmount = 0;
    const updatedItems = [];

    for (const item of items) {
      const amount = Number(item.amount || item.qnty * item.rate);
      totalAmount += amount;

      let subUnits = 1;
      if (item.pack && item.pack.includes("x")) {
        const parts = item.pack.split("x").map(Number);
        if (!isNaN(parts[1])) subUnits = parts[1];
      }

      const stockPacks = Number(item.qnty);
      const stockUnits = stockPacks * subUnits;
      const pricePerUnit =
        Number(item.retailPrice) && subUnits > 0
          ? Number(item.retailPrice) / subUnits
          : Number(item.retailPrice);

      if (item.product) {
        const product = await Product.findById(item.product);
        if (product) {
          product.name = item.name;
          product.hsnCode = item.hsnCode;
          product.manufacturer = item.manufacturerName;
          product.batchNumber = item.batchNo;
          product.expiryDate = item.expiryDate;
          product.costPrice = Number(item.rate);
          product.price = Number(item.retailPrice);
          product.discountPercentage = Number(item.discountPercent || 0);
          product.gstPercentage =
            Number(item.cgstPercent || 0) + Number(item.sgstPercent || 0);
          product.cgstPercent = Number(item.cgstPercent || 0);
          product.sgstPercent = Number(item.sgstPercent || 0);
          product.scheme = item.scheme;
          product.pack = item.pack;
          product.subUnits = subUnits;
          product.stock = stockPacks;
          product.stockPacks = stockPacks;
          product.stockUnits = stockUnits;
          product.pricePerUnit = pricePerUnit;

          await product.save();
        }
      } else {
        if (product) {
          product.name = item.name;
          product.hsnCode = item.hsnCode;
          product.manufacturer = item.manufacturerName;
          product.batchNumber = item.batchNo;
          product.expiryDate = item.expiryDate;
          product.costPrice = Number(item.rate);
          product.price = Number(item.retailPrice);
          product.discountPercentage = Number(item.discountPercent || 0);
          product.gstPercentage =
            Number(item.cgstPercent || 0) + Number(item.sgstPercent || 0);
          product.cgstPercent = Number(item.cgstPercent || 0);
          product.sgstPercent = Number(item.sgstPercent || 0);
          product.scheme = item.scheme;

          // parse pack/unit
          const parsedPackType =
            item.packType ||
            item.pack?.split("x")[0] ||
            product.packType ||
            "unit";
          let parsedUnitsPerPack = Number(item.subUnits);
          if (!parsedUnitsPerPack || isNaN(parsedUnitsPerPack)) {
            // fallback to parsing pack string or keep existing
            parsedUnitsPerPack = product.unitsPerPack || product.subUnits || 1;
          }
          const parsedPacksQuantity =
            Number(item.qnty) || product.packsQuantity || 0;
          const parsedTotalUnits = parsedPacksQuantity * parsedUnitsPerPack;

          product.pack = item.pack;
          product.packType = parsedPackType;
          product.unitsPerPack = parsedUnitsPerPack;
          product.packsQuantity = parsedPacksQuantity;
          product.totalUnits = parsedTotalUnits;

          // remaining amounts should reflect updated stock values — here we set them equal to provided qnty
          product.remainingPacks = parsedPacksQuantity;
          product.remainingUnits = parsedTotalUnits;

          product.subUnits = parsedUnitsPerPack;
          product.stock = parsedPacksQuantity;
          product.stockPacks = parsedPacksQuantity;
          product.stockUnits = parsedTotalUnits;
          product.pricePerUnit =
            Number(item.pricePerUnit) || product.pricePerUnit;

          await product.save();
        }

        item.product = savedProduct._id;
      }
      updatedItems.push({
        ...item,
        amount,
        product: item.product,
        subUnits: Number(item.subUnits) || 1, // ⬅️⬅️⬅️
        pricePerUnit: Number(item.pricePerUnit) || 0,
      });
    }

    purchaseBill.items = updatedItems;
    purchaseBill.totalAmount = totalAmount;

    const updatedBill = await purchaseBill.save();

    res.status(200).json({
      message: "Purchase bill and products updated successfully",
      purchaseBill: updatedBill,
    });
  } catch (err) {
    console.error("❌ Failed to update purchase bill:", err);
    res.status(500).json({
      message: "Failed to update purchase bill",
      error: err.message,
    });
  }
};

// 5️⃣ Delete purchase bill
exports.deletePurchasedBill = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;
    const { id } = req.params;

    const purchaseBill = await PurchaseBill.findOne({
      _id: id,
      enterprise: enterpriseId,
    });

    if (!purchaseBill) {
      return res.status(404).json({ message: "Purchase bill not found" });
    }

    const productIds = purchaseBill.items
      .filter((item) => item.product)
      .map((item) => item.product);

    if (productIds.length > 0) {
      await Product.deleteMany({ _id: { $in: productIds } });
    }

    await PurchaseBill.deleteOne({ _id: id });

    res.status(200).json({
      message: "Purchase bill and associated products deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete purchase bill",
      error: err.message,
    });
  }
};
