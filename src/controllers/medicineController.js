const Medicine = require("../models/Medicine");

// GET /api/medicines
exports.getAllMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find();
    res.status(200).json(medicines);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};
