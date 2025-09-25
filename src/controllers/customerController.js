// controllers/customerController.js
const Customer = require("../models/Customer");

exports.getAllCustomers = async (req, res) => {
  const { name, mobile } = req.query;
  const filters = { enterprise: req.user.enterprise };

  if (name) filters.name = { $regex: name, $options: "i" };
  if (mobile) filters.mobile = { $regex: mobile, $options: "i" };

  try {
    const customers = await Customer.find(filters);
    res.status(200).json({ customers });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch customers", error: err.message });
  }
};
