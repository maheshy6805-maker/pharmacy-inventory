const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    purpose: { type: String, required: true }, // NEW
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", otpSchema);
