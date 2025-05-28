const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    salt: { type: String, required: true },
    company: String,
    price: Number,
    stock: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Medicine", medicineSchema);
