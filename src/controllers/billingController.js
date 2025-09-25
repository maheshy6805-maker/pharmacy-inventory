// controllers/billingController.js
const Product = require("../models/Product");
const Bill = require("../models/Bill");
const Customer = require("../models/Customer");

exports.generateBill = async (req, res) => {
  const { products, customer, totalAmount, prescribingDoctor } = req.body;
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
    // 🔹 Create or Find Customer
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

    const bill = new Bill({
      enterprise: enterpriseId,
      products: productDetails,
      totalAmount,
      prescribingDoctor,
      customer: existingCustomer._id,
    });

    const savedBill = await bill.save();

    res.status(201).json({
      message: "Bill generated successfully",
      bill: savedBill,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to generate bill", error: err.message });
  }
};
