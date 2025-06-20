// controllers/billingController.js
const Product = require("../models/Product");
const Bill = require("../models/Bill");

exports.generateBill = async (req, res) => {
  const { products, isBillOnDebt, customerName, prescribingDoctor } = req.body;
  const enterpriseId = req.user.enterprise;

  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ message: "Product list is required" });
  }

  try {
    let totalAmount = 0;
    let discountAmount = 0;
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

      let quantity = item.quantity || 0;
      let subUnitsPurchased = item.subUnitsPurchased || 0;
      let totalPrice = 0;
      let unitPrice = 0;

      if (product.cutSelling) {
        if (!subUnitsPurchased || subUnitsPurchased <= 0) {
          return res
            .status(400)
            .json({ message: `Invalid sub-unit quantity for ${product.name}` });
        }

        unitPrice = product.pricePerUnit;
        totalPrice = subUnitsPurchased * unitPrice;
        product.stock -= subUnitsPurchased / product.subUnits;
      } else {
        if (!quantity || quantity <= 0) {
          return res
            .status(400)
            .json({ message: `Invalid quantity for ${product.name}` });
        }

        unitPrice = product.price;
        totalPrice = quantity * unitPrice;
        product.stock -= quantity;
      }

      if (product.stock < 0) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${product.name}` });
      }

      await product.save();

      const discount = (totalPrice * (product.discountPercentage || 0)) / 100;
      discountAmount += discount;
      totalAmount += totalPrice;

      productDetails.push({
        product: product._id,
        quantity,
        subUnitsPurchased,
        unitPrice,
        totalPrice,
      });
    }

    const finalAmount = totalAmount - discountAmount;

    const bill = new Bill({
      enterprise: enterpriseId,
      products: productDetails,
      totalAmount,
      discountAmount,
      finalAmount,
      isBillOnDebt,
      customerName,
      prescribingDoctor,
    });

    const savedBill = await bill.save();
    res.status(201).json({ message: "Bill generated", bill: savedBill });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to generate bill", error: err.message });
  }
};
