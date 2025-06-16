const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: String,
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    aadhaar: String,
    role: { type: String, enum: ["ADMIN", "PHARMACIST"], required: true },
    enterprise: { type: mongoose.Schema.Types.ObjectId, ref: "Enterprise" },
    password: String,
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
