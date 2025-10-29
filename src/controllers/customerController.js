// controllers/customerController.js
const Customer = require("../models/Customer");
const paginate = require("../utils/pagination");

exports.getAllCustomers = async (req, res) => {
  const { name, mobile, page = 1, limit = 10 } = req.query;
  const filters = { enterprise: req.user.enterprise };

  if (name) filters.name = { $regex: name, $options: "i" };
  if (mobile) filters.mobile = { $regex: mobile, $options: "i" };

  try {
    const customers = await Customer.find(filters);
    const result = paginate(customers, {}, page, limit);
    res.status(200).json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch customers", error: err.message });
  }
};
