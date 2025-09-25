// models/Customer.js
const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    enterprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enterprise",
      required: true,
    },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
