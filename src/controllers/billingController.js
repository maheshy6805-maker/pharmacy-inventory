const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductMaster = require("../models/ProductMaster");
const Bill = require("../models/Bill");
const Customer = require("../models/Customer");
const { generateBillPDF } = require("../utils/pdfGenerator");
const { sendBillEmail } = require("../utils/sendEmail");
const { uploadToR2 } = require("../utils/uploadToR2"); // R2 uploader
const path = require("path");
const { sendWhatsappMessage } = require("../utils/sendWhatsappMessage");
const paginate = require("../utils/pagination");
const Enterprise = require("../models/Enterprise");

// ----------------------------------------------------
// 1️⃣ Generate New Bill (returning detailed populated bill)
// ----------------------------------------------------

exports.generateBill = async (req, res) => {
  const {
    products,
    customer,
    totalAmount,
    prescribingDoctor,
    paymentMode,
    billingDate,
  } = req.body;
  const enterpriseId = req.user.enterprise;

  if (!products?.length) {
    return res.status(400).json({ message: "Products are required" });
  }

  if (!customer?.name || !customer?.mobile) {
    return res
      .status(400)
      .json({ message: "Customer name and mobile required" });
  }

  try {
    // ✅ Find or create customer
    let existingCustomer = await Customer.findOne({
      enterprise: enterpriseId,
      mobile: customer.mobile,
    });

    if (!existingCustomer) {
      existingCustomer = await Customer.create({
        enterprise: enterpriseId,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
      });
    }

    const productDetails = [];
    const warnings = [];
    const remainingStockArray = [];

    // 🧮 Loop through products in bill
    for (const item of products) {
      let productData = null;
      let foundType = "CUSTOM";
      let unitPrice = 0;
      let totalPrice = 0;
      let saleUnits = 0;
      let salePacks = 0;

      // 🟢 FROM_STOCK
      if (mongoose.isValidObjectId(item.productId)) {
        productData = await Product.findOne({
          _id: item.productId,
          enterprise: enterpriseId,
        });

        if (productData) {
          foundType = "FROM_STOCK";

          saleUnits = Number(item.quantitySold);

          // 🔥🔥 NEW LOGIC (your patch applied here) 🔥🔥
          const subUnits =
            Number(productData.subUnits) ||
            Number(productData.unitsPerPack) ||
            1;

          // Validate missing canonical fields
          if (
            productData.remainingUnits === undefined ||
            productData.remainingPacks === undefined
          ) {
            productData.remainingUnits = Number(
              productData.stockUnits || productData.stock * subUnits || 0
            );
            productData.remainingPacks = Math.floor(
              productData.remainingUnits / subUnits
            );
          }

          // Check availability
          if (productData.remainingUnits < saleUnits) {
            warnings.push(
              `⚠️ Negative billing: ${productData.name} had ${productData.remainingUnits} units in stock but sold ${saleUnits}`
            );
          }

          // Decrease units
          productData.remainingUnits =
            Number(productData.remainingUnits) - Number(saleUnits);
          if (productData.remainingUnits < 0) productData.remainingUnits = 0;

          // Recompute packs
          productData.remainingPacks = Math.floor(
            productData.remainingUnits / subUnits
          );

          // Sync legacy aliases
          productData.stockUnits = productData.remainingUnits;
          productData.stockPacks = productData.remainingPacks;
          productData.stock = productData.remainingPacks;

          // Compute human readable stock
          productData.remainingStock = productData.getDisplayStock
            ? productData.getDisplayStock()
            : `${productData.remainingPacks} ${productData.packType}` +
              (productData.remainingUnits -
              productData.remainingPacks * subUnits
                ? ` + ${
                    productData.remainingUnits -
                    productData.remainingPacks * subUnits
                  } units`
                : "");

          await productData.save();
          // 🔥🔥 PATCHED LOGIC ENDS 🔥🔥

          // Calculate sale price
          salePacks = saleUnits / subUnits;

          unitPrice =
            productData.pricePerUnit > 0
              ? productData.pricePerUnit
              : productData.price / subUnits;

          totalPrice = saleUnits * unitPrice;

          // 🧾 Compute readable stock for response
          const readableStock = productData.getDisplayStock();
          remainingStockArray.push({
            productName: productData.name,
            readableStock,
          });

          productDetails.push({
            product: {
              _id: productData._id,
              name: productData.name,
              scheme: productData.scheme || "",
              packing: productData.pack || "",
              batchNumber: productData.batchNumber || "",
              expiryDate: productData.expiryDate || "",
              costPrice: productData.costPrice,
              price: productData.price,
              pricePerUnit: productData.pricePerUnit,
              discount: productData.discountPercentage || 0,
              gst: productData.gstPercentage || 0,
            },
            quantitySold: saleUnits,
            saleUnits,
            salePacks,
            unitPrice,
            totalPrice,
            fromMaster: false,
            custom: false,
          });

          continue;
        }
      }

      // 🟡 FROM_MASTER
      const master = await ProductMaster.findOne({
        $or: [
          { id: item.productId },
          { name: item.productId?.replace(/^MASTER-/, "") },
        ],
      });

      if (master) {
        foundType = "FROM_MASTER";

        saleUnits = item.quantitySold;
        salePacks = saleUnits;
        unitPrice =
          parseFloat(item.price || item.unitPrice || master.price || 0) || 0;
        totalPrice = unitPrice * saleUnits;

        warnings.push(`Item from ProductMaster used: ${master.name}`);

        productDetails.push({
          product: {
            _id: `MASTER-${master.id || master.name}`,
            name: item.name || master.name,
            scheme: item.scheme || master.scheme || "",
            packing: item.packing || master.pack_size_label || "",
            batchNumber: item.batchNumber || "",
            expiryDate: item.expiryDate || "",
            costPrice: Number(item.costPrice ?? 0),
            price: unitPrice,
            pricePerUnit: unitPrice,
            discount: item.discount ?? master.discountPercentage ?? 0,
            gst: item.gst ?? master.gstPercentage ?? 0,
          },
          quantitySold: saleUnits,
          saleUnits,
          salePacks,
          unitPrice,
          totalPrice,
          fromMaster: true,
          custom: false,
        });

        continue;
      }

      // 🔴 CUSTOM
      foundType = "CUSTOM";
      saleUnits = Number(item.quantitySold);
      salePacks = saleUnits;
      unitPrice = item.price || item.unitPrice || 0;
      totalPrice = unitPrice * saleUnits;

      warnings.push(`Custom item manually added: ${item.name}`);

      productDetails.push({
        product: {
          _id: `CUSTOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: item.name || "Custom Product",
          scheme: item.scheme || "",
          packing: item.packing || "",
          batchNumber: item.batchNumber || "",
          expiryDate: item.expiryDate || "",
          costPrice: Number(item.costPrice ?? 0),
          price: unitPrice,
          pricePerUnit: unitPrice,
          discount: item.discount || 0,
          gst: item.gst || 0,
        },
        quantitySold: saleUnits,
        saleUnits,
        salePacks,
        unitPrice,
        totalPrice,
        fromMaster: false,
        custom: true,
      });
    }

    // ✅ Bill type
    let billType = "FROM_STOCK";
    if (productDetails.some((p) => p.fromMaster)) billType = "FROM_MASTER";
    if (productDetails.some((p) => p.custom)) billType = "CUSTOM";

    // ✅ Save bill
    const bill = await Bill.create({
      enterprise: enterpriseId,
      products: productDetails,
      totalAmount,
      prescribingDoctor,
      customer: existingCustomer._id,
      paymentMode: paymentMode || "Cash",
      billType,
      billingDate: billingDate || Date.now(),
      warnings,
    });

    const populatedBill = await Bill.findById(bill._id).populate(
      "customer",
      "name mobile email"
    );

    const enterprise = (await Enterprise.findOne({
      _id: req.user.enterprise,
    })) || {
      name: "Pharmalogy",
    };

    const pdfPath = await generateBillPDF(populatedBill, enterprise);
    const r2FileUrl = await uploadToR2(
      pdfPath,
      `${populatedBill._id}.pdf`,
      "application/pdf"
    );

    populatedBill.billFileUrl = r2FileUrl;
    await populatedBill.save();

    // ✅ Notifications
    if (populatedBill.customer?.email) {
      await sendBillEmail(
        populatedBill.customer.email,
        populatedBill,
        r2FileUrl,
        enterprise
      );
    }

    if (populatedBill.customer?.mobile) {
      const whatsappMessage = `Hello ${
        populatedBill.customer?.name || "Customer"
      },

Thank you for your purchase from ${enterprise.name}.
💰 Total Amount: ₹${populatedBill.totalAmount}
💳 Payment Mode: ${populatedBill.paymentMode}
🧾 Bill Type: ${billType}
${warnings.length ? "\n⚠️ Notes:\n" + warnings.join("\n") : ""}
📄 Bill: ${r2FileUrl}

Thank you! Visit again.`;

      await sendWhatsappMessage(populatedBill.customer.mobile, whatsappMessage);
    }

    res.status(201).json({
      message: "Bill generated successfully",
      bill: populatedBill,
      billingDate: populatedBill.billingDate,
      fileUrl: r2FileUrl,
      warnings,
      remainingStock: remainingStockArray,
    });
  } catch (err) {
    console.error("❌ Bill generation failed:", err);
    res.status(500).json({
      message: "Failed to generate bill",
      error: err.message,
    });
  }
};

// ----------------------------------------------------
// 2️⃣ Get All Bills (with full product + customer details)
// ----------------------------------------------------
exports.getAllBills = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;
    const search = req.query.search?.trim() || "";
    const searchRegex = new RegExp(search, "i");
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Step 1️⃣ — Fetch bills
    let bills = await Bill.find({ enterprise: enterpriseId })
      .populate("customer", "name mobile email")
      .sort({ createdAt: -1 })
      .lean();

    // Step 2️⃣ — Collect referenced product IDs (for old bills)
    const allProductIds = bills.flatMap((b) =>
      b.products
        .map((p) =>
          p.product && typeof p.product === "string" ? p.product : null
        )
        .filter(Boolean)
    );

    // Step 3️⃣ — Load referenced product docs in bulk
    const productDocs = await Product.find({
      _id: { $in: allProductIds },
    })
      .select(
        "name brand manufacturer category subcategory salt price costPrice discountPercentage gstPercentage batchNumber unit stock prescriptionRequired expiryDate cutSelling subUnits pricePerUnit image scheme packing"
      )
      .lean();

    const productMap = {};
    for (const prod of productDocs) productMap[prod._id.toString()] = prod;

    // Step 4️⃣ — Normalize bills (handle embedded + referenced products)
    const normalizedBills = bills.map((bill) => {
      const normalizedProducts = bill.products.map((p) => {
        let prodData = {};

        // CASE 1 — Old bill with product ObjectId (lookup from Product)
        if (typeof p.product === "string" && productMap[p.product]) {
          prodData = productMap[p.product];
        }

        // CASE 2 — New bill (product embedded inline)
        else if (typeof p.product === "object" && p.product !== null) {
          prodData = { ...p.product };
        }

        // Normalize field naming & fill defaults
        return {
          ...p,
          product: {
            _id: prodData._id || p._id || "",
            name: prodData.name || "",
            brand: prodData.brand || "",
            manufacturer: prodData.manufacturer || "",
            category: prodData.category || "",
            subcategory: prodData.subcategory || "",
            salt: prodData.salt || "",
            scheme: prodData.scheme || "",
            packing: prodData.packing || "",
            batchNumber: prodData.batchNumber || "",
            expiryDate: prodData.expiryDate || "",
            price: Number(prodData.price ?? p.unitPrice ?? 0),
            costPrice: Number(prodData.costPrice ?? 0),
            discount: Number(
              prodData.discount ?? prodData.discountPercentage ?? 0
            ),
            gst: Number(prodData.gst ?? prodData.gstPercentage ?? 0),
            unit: prodData.unit || "",
            stock: prodData.stock ?? null,
            image: prodData.image || "",
          },
        };
      });

      return { ...bill, products: normalizedProducts };
    });

    // Step 5️⃣ — Apply search if provided
    let filteredBills = normalizedBills;
    if (search) {
      filteredBills = normalizedBills.filter((bill) => {
        const matchesCustomer =
          bill.customer &&
          (searchRegex.test(bill.customer.name) ||
            searchRegex.test(bill.customer.mobile) ||
            searchRegex.test(bill.customer.email));

        const matchesDoctor = searchRegex.test(bill.prescribingDoctor || "");

        const matchesProduct = bill.products.some((p) =>
          searchRegex.test(p.product?.name || "")
        );

        const matchesManufacturer = bill.products.some((p) =>
          searchRegex.test(p.product?.manufacturer || "")
        );

        const matchesCategory = bill.products.some((p) =>
          searchRegex.test(p.product?.category || "")
        );

        return (
          matchesCustomer ||
          matchesDoctor ||
          matchesProduct ||
          matchesManufacturer ||
          matchesCategory
        );
      });
    }

    // Step 6️⃣ — Paginate the results
    const paginated = paginate(filteredBills, {}, page, limit);

    // ✅ Final response
    res.status(200).json({
      total: paginated.total,
      totalPages: paginated.totalPages,
      page: paginated.page,
      limit: paginated.limit,
      bills: paginated.data,
    });
  } catch (err) {
    console.error("❌ Failed to fetch bills:", err);
    res.status(500).json({
      message: "Failed to fetch bills",
      error: err.message,
    });
  }
};

// ----------------------------------------------------
// 3️⃣ Update Bill (unchanged, but populates details)
// ----------------------------------------------------
// ----------------------------------------------------
// 5️⃣ Edit Existing Bill (adjust product stock if FROM_STOCK)
// ----------------------------------------------------
exports.updateBill = async (req, res) => {
  try {
    const billId = req.params.billId || req.params.id;

    // 🔥 include billingDate
    const {
      products,
      totalAmount,
      prescribingDoctor,
      paymentMode,
      billingDate,
    } = req.body;

    const enterpriseId = req.user.enterprise;

    if (!billId) {
      return res.status(400).json({ message: "Bill ID is required" });
    }

    const existingBill = await Bill.findOne({
      _id: billId,
      enterprise: enterpriseId,
    }).lean();

    if (!existingBill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // 🟢 Adjust stock if bill was FROM_STOCK
    if (existingBill.billType === "FROM_STOCK") {
      for (const oldItem of existingBill.products) {
        const oldProductId =
          typeof oldItem.product === "object"
            ? oldItem.product._id
            : oldItem.product;

        const updatedItem = products.find(
          (p) =>
            p.productId?.toString() === oldProductId?.toString() ||
            p.product?._id?.toString() === oldProductId?.toString()
        );

        const productData = await Product.findOne({
          _id: oldProductId,
          enterprise: enterpriseId,
        });

        if (!productData) continue;

        const oldQty = oldItem.quantitySold;
        const newQty = updatedItem ? updatedItem.quantitySold : 0;
        const diff = newQty - oldQty;

        productData.stock -= diff;
        if (productData.stock < 0) productData.stock = 0;

        await productData.save();
      }
    }

    // 🔧 Build new billed products
    const updatedProductDetails = [];
    const warnings = [];

    for (const item of products) {
      let productData = null;
      let unitPrice = 0;
      let totalPrice = 0;

      // STOCK
      if (mongoose.isValidObjectId(item.productId)) {
        productData = await Product.findOne({
          _id: item.productId,
          enterprise: enterpriseId,
        });

        if (productData) {
          unitPrice = productData.price;
          totalPrice = unitPrice * item.quantitySold;

          updatedProductDetails.push({
            product: {
              _id: productData._id,
              name: productData.name,
              scheme: productData.scheme || "",
              packing: productData.packing || "",
              batchNumber: productData.batchNumber || "",
              expiryDate: productData.expiryDate || "",
              price: productData.price || 0,
              discount: productData.discountPercentage || 0,
              gst: productData.gstPercentage || 0,
            },
            quantitySold: item.quantitySold,
            unitPrice,
            totalPrice,
            fromMaster: false,
            custom: false,
          });

          continue;
        }
      }

      // MASTER
      const master = await ProductMaster.findOne({
        $or: [
          { id: item.productId },
          { name: item.productId?.replace(/^MASTER-/, "") },
        ],
      });

      if (master) {
        unitPrice =
          parseFloat(item.price || item.unitPrice || master.price || 0) || 0;
        totalPrice = unitPrice * item.quantitySold;

        updatedProductDetails.push({
          product: {
            _id: `MASTER-${master.id || master.name}`,
            name: item.name || master.name,
            scheme: item.scheme || master.scheme || "",
            packing: item.packing || master.packing || "",
            batchNumber: item.batchNumber || master.batchNumber || "",
            expiryDate: item.expiryDate || master.expiryDate || "",
            price: unitPrice,
            discount: item.discount ?? master.discountPercentage ?? 0,
            gst: item.gst ?? master.gstPercentage ?? 0,
          },
          quantitySold: item.quantitySold,
          unitPrice,
          totalPrice,
          fromMaster: true,
          custom: false,
        });

        continue;
      }

      // CUSTOM
      unitPrice = item.price || item.unitPrice || 0;
      totalPrice = unitPrice * item.quantitySold;

      updatedProductDetails.push({
        product: {
          _id: `CUSTOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: item.name || "Custom Product",
          scheme: item.scheme || "",
          packing: item.packing || "",
          batchNumber: item.batchNumber || "",
          expiryDate: item.expiryDate || "",
          price: unitPrice,
          discount: item.discount || 0,
          gst: item.gst || 0,
        },
        quantitySold: item.quantitySold,
        unitPrice,
        totalPrice,
        fromMaster: false,
        custom: true,
      });
    }

    // determine bill type
    let billType = "FROM_STOCK";
    if (updatedProductDetails.some((p) => p.fromMaster))
      billType = "FROM_MASTER";
    if (updatedProductDetails.some((p) => p.custom)) billType = "CUSTOM";

    // 🔥 UPDATE BILL WITH billingDate
    const updatedBill = await Bill.findByIdAndUpdate(
      billId,
      {
        $set: {
          products: updatedProductDetails,
          totalAmount,
          prescribingDoctor,
          paymentMode,
          billType,
          warnings,
          billingDate: billingDate || existingBill.billingDate || Date.now(), // ⭐ NEW
        },
      },
      { new: true }
    ).populate("customer", "name mobile email");

    res.status(200).json({
      message: "Bill updated successfully",
      bill: updatedBill,
      billingDate: updatedBill.billingDate, // ⭐ NEW
    });
  } catch (err) {
    console.error("❌ Failed to edit bill:", err);
    res.status(500).json({
      message: "Failed to edit bill",
      error: err.message,
    });
  }
};

// ----------------------------------------------------
// 4️⃣ Update Payment Mode (for Debt bills)
// PATCH /api/bills/payment-received?billId=<billId>
// ----------------------------------------------------
exports.updatePaymentReceived = async (req, res) => {
  try {
    const { billId } = req.query;
    const { paymentMode } = req.body;
    const enterpriseId = req.user.enterprise;

    if (!billId) {
      return res.status(400).json({ message: "Bill ID is required" });
    }

    if (!paymentMode || !["Cash", "UPI", "Card"].includes(paymentMode)) {
      return res.status(400).json({
        message: "Invalid payment mode. Allowed: Cash, UPI, Card",
      });
    }

    // Find the bill
    const bill = await Bill.findOne({
      _id: billId,
      enterprise: enterpriseId,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Ensure current bill is in 'Debt' mode
    if (bill.paymentMode !== "Debt") {
      return res.status(400).json({
        message:
          "Payment can only be received for bills with paymentMode = 'Debt'",
      });
    }

    // Update payment mode
    bill.paymentMode = paymentMode;
    await bill.save();

    res.status(200).json({
      message: `Payment received successfully via ${paymentMode}`,
      bill,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update payment mode",
      error: err.message,
    });
  }
};

// ================================================
//  GET TRUE PROFIT / LOSS (DATE FILTER SUPPORTED)
// ================================================
exports.getProfitLoss = async (req, res) => {
  try {
    const enterpriseId = req.user.enterprise;

    // Query params
    const { startDate, endDate } = req.query;

    let dateFilter = { enterprise: enterpriseId };

    // -------------------------------------------
    // If both dates passed → filter between them
    // If only one passed → auto-complete logically
    // If none passed → return all bills
    // -------------------------------------------
    if (startDate && endDate) {
      dateFilter.billingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      dateFilter.billingDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      dateFilter.billingDate = { $lte: new Date(endDate) };
    }

    // Fetch filtered bills
    const bills = await Bill.find(dateFilter).lean();

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    for (const bill of bills) {
      for (const line of bill.products) {
        const qty = Number(line.quantitySold || 0);
        if (!qty) continue;

        let sellingPricePerUnit = 0;
        let costPricePerUnit = 0;

        // -----------------------------------------------
        // CASE 1 — FROM STOCK (product exists in inventory)
        // -----------------------------------------------
        if (
          line.product &&
          line.product._id &&
          line.fromMaster === false &&
          line.custom === false
        ) {
          const productId =
            typeof line.product === "object" ? line.product._id : line.product;

          const product = await Product.findById(productId).lean();

          if (product) {
            const unitsPerPack = Number(product.unitsPerPack || 1);

            // cost price of one unit
            costPricePerUnit = Number(product.costPrice || 0) / unitsPerPack;

            // selling price
            sellingPricePerUnit =
              Number(product.pricePerUnit) ||
              Number(product.price || 0) / unitsPerPack;

            // apply discount
            const discount = Number(
              line.product.discount || line.discount || 0
            );
            sellingPricePerUnit *= 1 - discount / 100;
          }
        }

        // -----------------------------------------------
        // CASE 2 — FROM MASTER or CUSTOM
        // -----------------------------------------------
        else {
          sellingPricePerUnit = Number(
            line.unitPrice || line.pricePerUnit || line.price || 0
          );

          const discount = Number(line.discount || 0);
          sellingPricePerUnit *= 1 - discount / 100;

          // cost price unknown → 0
          costPricePerUnit =
            Number(line.product.costPrice || line.costPrice || 0) /
            Number(line.product.unitsPerPack || line.unitsPerPack || 1);
        }

        // -----------------------------------------------
        // CALCULATE
        // -----------------------------------------------
        const lineRevenue = sellingPricePerUnit * qty;
        const lineCost = costPricePerUnit * qty;
        const lineProfit = lineRevenue - lineCost;

        totalRevenue += lineRevenue;
        totalCost += lineCost;
        totalProfit += lineProfit;
      }
    }

    res.status(200).json({
      message: "Profit/Loss calculated successfully",
      startDate: startDate || null,
      endDate: endDate || null,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
    });
  } catch (err) {
    console.error("❌ Profit/Loss error:", err);
    res.status(500).json({
      message: "Failed to calculate profit/loss",
      error: err.message,
    });
  }
};
