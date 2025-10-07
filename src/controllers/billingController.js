const Product = require("../models/Product");
const Bill = require("../models/Bill");
const Customer = require("../models/Customer");

// ----------------------------------------------------
// 1️⃣ Generate New Bill (returning detailed populated bill)
// ----------------------------------------------------
exports.generateBill = async (req, res) => {
  const { products, customer, totalAmount, prescribingDoctor, paymentMode } =
    req.body;
  const enterpriseId = req.user.enterprise;

  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: "Products are required" });
  }

  if (!customer || !customer.name || !customer.mobile) {
    return res
      .status(400)
      .json({ message: "Customer name and mobile required" });
  }

  try {
    // 🔹 Create or find customer
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

    let productDetails = [];

    for (const item of products) {
      const product = await Product.findOne({
        _id: item.productId,
        enterprise: enterpriseId,
      });

      if (!product) {
        return res
          .status(404)
          .json({ message: `Product not found: ${item.productId}` });
      }

      if (!item.quantitySold || item.quantitySold <= 0) {
        return res
          .status(400)
          .json({ message: `Invalid quantity for ${product.name}` });
      }

      if (product.stock < item.quantitySold) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${product.name}` });
      }

      // 🔹 Decrease stock
      product.stock -= item.quantitySold;
      await product.save();

      const totalPrice = product.price * item.quantitySold;

      productDetails.push({
        product: product._id,
        quantitySold: item.quantitySold,
        unitPrice: product.price,
        totalPrice,
      });
    }

    // ✅ FIX HERE: use paymentMode if provided, else default "Cash"
    const bill = new Bill({
      enterprise: enterpriseId,
      products: productDetails,
      totalAmount,
      prescribingDoctor,
      customer: existingCustomer._id,
      paymentMode: paymentMode || "Cash",
    });

    const savedBill = await bill.save();

    // 🔹 Populate customer and product details
    const populatedBill = await Bill.findById(savedBill._id)
      .populate({
        path: "customer",
        select: "name mobile email",
      })
      .populate({
        path: "products.product",
        select:
          "name brand manufacturer category subcategory salt price costPrice discountPercentage gstPercentage batchNumber unit stock prescriptionRequired expiryDate cutSelling subUnits pricePerUnit image",
      });

    res.status(201).json({
      message: "Bill generated successfully",
      bill: populatedBill,
    });
  } catch (err) {
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

    const baseQuery = { enterprise: enterpriseId };

    // Fetch all bills with detailed population
    let bills = await Bill.find(baseQuery)
      .populate({
        path: "customer",
        select: "name mobile email",
      })
      .populate({
        path: "products.product",
        select:
          "name brand manufacturer category subcategory salt price costPrice discountPercentage gstPercentage batchNumber unit stock prescriptionRequired expiryDate cutSelling subUnits pricePerUnit image",
      })
      .sort({ createdAt: -1 });

    // 🔍 Apply search if present
    if (search) {
      bills = bills.filter((bill) => {
        const matchesCustomer =
          bill.customer &&
          (searchRegex.test(bill.customer.name) ||
            searchRegex.test(bill.customer.mobile) ||
            searchRegex.test(bill.customer.email));

        const matchesDoctor = searchRegex.test(bill.prescribingDoctor || "");

        const matchesProduct = bill.products.some(
          (p) => p.product && searchRegex.test(p.product.name)
        );

        return matchesCustomer || matchesDoctor || matchesProduct;
      });
    }

    res.status(200).json({
      count: bills.length,
      bills,
    });
  } catch (err) {
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
