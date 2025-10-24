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

// ----------------------------------------------------
// 1️⃣ Generate New Bill (returning detailed populated bill)
// ----------------------------------------------------

exports.generateBill = async (req, res) => {
  const { products, customer, totalAmount, prescribingDoctor, paymentMode } =
    req.body;
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

    for (const item of products) {
      let productData = null;
      let foundType = "CUSTOM";
      let unitPrice = 0;
      let totalPrice = 0;

      // 🟢 CASE 1 — Product from enterprise
      if (mongoose.isValidObjectId(item.productId)) {
        productData = await Product.findOne({
          _id: item.productId,
          enterprise: enterpriseId,
        });

        if (productData) {
          foundType = "FROM_STOCK";
          unitPrice = productData.price;
          totalPrice = unitPrice * item.quantitySold;

          if (productData.stock < item.quantitySold) {
            warnings.push(
              `Negative billing: ${productData.name} had ${productData.stock} in stock but sold ${item.quantitySold}`
            );
          }

          productData.stock -= item.quantitySold;
          await productData.save();

          productDetails.push({
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

      // 🟡 CASE 2 — ProductMaster
      const master = await ProductMaster.findOne({
        $or: [
          { id: item.productId },
          { name: item.productId?.replace(/^MASTER-/, "") },
        ],
      });

      if (master) {
        foundType = "FROM_MASTER";
        unitPrice =
          parseFloat(
            (master["price(₹)"] || master.price || "0")
              .toString()
              .replace(/[^\d.]/g, "")
          ) || 0;
        totalPrice = unitPrice * item.quantitySold;

        warnings.push(`Item from ProductMaster used: ${master.name}`);

        productDetails.push({
          product: {
            _id: `MASTER-${master.id || master.name}`,
            name: master.name,
            scheme: master.scheme || "",
            packing: master.packing || "",
            batchNumber: master.batchNumber || "",
            expiryDate: master.expiryDate || "",
            price: unitPrice,
            discount: master.discountPercentage || 0,
            gst: master.gstPercentage || 0,
          },
          quantitySold: item.quantitySold,
          unitPrice,
          totalPrice,
          fromMaster: true,
          custom: false,
        });

        continue;
      }

      // 🔴 CASE 3 — Custom entry
      foundType = "CUSTOM";
      unitPrice = item.unitPrice || 0;
      totalPrice = unitPrice * item.quantitySold;

      warnings.push(`Custom item manually added: ${item.name}`);

      productDetails.push({
        product: {
          _id: `CUSTOM-${Date.now()}`,
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

    // ✅ Determine bill type
    let billType = "FROM_STOCK";
    if (productDetails.some((p) => p.fromMaster)) billType = "FROM_MASTER";
    if (productDetails.some((p) => p.custom)) billType = "CUSTOM";

    // ✅ Create bill
    const bill = await Bill.create({
      enterprise: enterpriseId,
      products: productDetails,
      totalAmount,
      prescribingDoctor,
      customer: existingCustomer._id,
      paymentMode: paymentMode || "Cash",
      billType,
      warnings,
    });

    // ✅ Populate for PDF and sending
    const populatedBill = await Bill.findById(bill._id).populate(
      "customer",
      "name mobile email"
    );

    const enterprise = req.user.enterpriseData || { name: "Pharmalogy" };
    const pdfPath = await generateBillPDF(populatedBill, enterprise);
    const r2FileUrl = await uploadToR2(
      pdfPath,
      `${populatedBill._id}.pdf`,
      "application/pdf"
    );

    populatedBill.billFileUrl = r2FileUrl;
    await populatedBill.save();

    // ✅ Email if available
    if (populatedBill.customer?.email) {
      await sendBillEmail(
        populatedBill.customer.email,
        populatedBill,
        r2FileUrl,
        enterprise
      );
    }

    // ✅ WhatsApp if mobile available
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
      fileUrl: r2FileUrl,
      warnings,
    });
  } catch (err) {
    console.error("❌ Bill generation failed:", err);
    res
      .status(500)
      .json({ message: "Failed to generate bill", error: err.message });
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

    // Step 1️⃣ — Fetch bills (populate only customer)
    let bills = await Bill.find({ enterprise: enterpriseId })
      .populate("customer", "name mobile email")
      .sort({ createdAt: -1 })
      .lean();

    // Step 2️⃣ — Identify old bills that reference products
    const allProductIds = bills.flatMap((b) =>
      b.products
        .map((p) =>
          p.product && typeof p.product === "string" ? p.product : null
        )
        .filter(Boolean)
    );

    // Step 3️⃣ — Load all referenced products in one go
    const productDocs = await Product.find({
      _id: { $in: allProductIds },
    })
      .select(
        "name brand manufacturer category subcategory salt price costPrice discountPercentage gstPercentage batchNumber unit stock prescriptionRequired expiryDate cutSelling subUnits pricePerUnit image"
      )
      .lean();

    const productMap = {};
    for (const prod of productDocs) productMap[prod._id.toString()] = prod;

    // Step 4️⃣ — Normalize all bills (merge embedded + populated product data)
    const normalizedBills = bills.map((bill) => {
      const normalizedProducts = bill.products.map((p) => {
        let prodData = {};

        // CASE 1: old bill with product ObjectId
        if (typeof p.product === "string" && productMap[p.product]) {
          prodData = productMap[p.product];
        }

        // CASE 2: new bill (product inline object)
        if (typeof p.product === "object" && p.product !== null) {
          prodData = {
            ...p.product,
            name: p.product.name || p.name || "",
          };
        }

        return {
          ...p,
          product: {
            _id: prodData._id || p._id || "",
            name: prodData.name || "",
            manufacturer: prodData.manufacturer || "",
            category: prodData.category || "",
            batchNumber: prodData.batchNumber || "",
            brand: prodData.brand || "",
            subcategory: prodData.subcategory || "",
            salt: prodData.salt || "",
            price: prodData.price || p.unitPrice || 0,
            costPrice: prodData.costPrice || 0,
            gstPercentage: prodData.gstPercentage || 0,
            expiryDate: prodData.expiryDate || "",
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

    // ✅ Final Response
    res.status(200).json({
      count: filteredBills.length,
      bills: filteredBills,
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
exports.updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const enterpriseId = req.user.enterprise;
    const updateData = req.body;

    const updatedBill = await Bill.findOneAndUpdate(
      { _id: id, enterprise: enterpriseId },
      { $set: updateData },
      { new: true }
    )
      .populate({
        path: "products.product",
        select:
          "name brand manufacturer category subcategory salt price costPrice discountPercentage gstPercentage batchNumber unit stock prescriptionRequired expiryDate cutSelling subUnits pricePerUnit image",
      })
      .populate("customer", "name mobile email");

    if (!updatedBill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.status(200).json({
      message: "Bill updated successfully",
      bill: updatedBill,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update bill",
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
