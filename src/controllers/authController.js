const User = require("../models/User");
const Enterprise = require("../models/Enterprise");
const Otp = require("../models/Otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../utils/sendEmail");
require("dotenv").config();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "56b060244fe26ea0ec0a9895bd257a78aec92965b451303792c3a94237a9165at";

// exports.register = async (req, res) => {
//   const { username, email, password } = req.body;
//   try {
//     const existing = await User.findOne({ email });
//     if (existing)
//       return res
//         .status(400)
//         .json({ message: "User already exists with this email" });

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       username,
//       email,
//       password: hashedPassword,
//     });
//     res.status(201).json({ message: "User registered successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };
exports.registerEnterpriseAdmin = async (req, res) => {
  const { enterpriseName, fullName, username, email, aadhaar } = req.body;

  try {
    let enterprise = await Enterprise.findOne({ name: enterpriseName });
    if (enterprise)
      return res.status(400).json({ message: "Enterprise already exists" });

    enterprise = new Enterprise({ name: enterpriseName });
    await enterprise.save();

    const user = new User({
      fullName,
      username,
      email,
      aadhaar,
      role: "ADMIN",
      enterprise: enterprise._id,
    });

    await user.save();

    const otp = Math.floor(100000 + Math.random() * 900000);
    await Otp.create({ email, otp, purpose: "admin_registration" });
    await sendOtpEmail(email, otp);

    res
      .status(201)
      .json({ message: "OTP sent to email. Verify to complete registration." });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error registering admin", error: err.message });
  }
};

exports.resendOtp = async (req, res) => {
  const { email, purpose } = req.body;

  if (!email || !purpose) {
    return res.status(400).json({ message: "Email and purpose are required" });
  }

  try {
    const existingOtp = await Otp.findOne({ email, purpose }).sort({
      createdAt: -1,
    });
    if (existingOtp) {
      const minutesPassed =
        (Date.now() - existingOtp.createdAt.getTime()) / 60000;
      if (minutesPassed < 1) {
        return res.status(429).json({
          message: "Please wait a minute before requesting another OTP",
        });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    await Otp.create({ email, otp, purpose });

    await sendOtpEmail(email, otp);

    res.status(200).json({ message: "OTP resent to email successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to resend OTP", error: err.message });
  }
};

exports.verifyOtpAndSetPassword = async (req, res) => {
  const { email, otp, password, purpose } = req.body;

  if (!otp || !password || !purpose) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    if (purpose === "admin_registration") {
      // OTP sent to admin's own email
      const validOtp = await Otp.findOne({ email, otp, purpose });
      if (!validOtp)
        return res.status(400).json({ message: "Invalid or expired OTP" });

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "User not found" });

      user.password = await bcrypt.hash(password, 10);
      user.isVerified = true;
      await user.save();

      await Otp.deleteMany({ email, purpose });

      return res
        .status(200)
        .json({ message: "Admin verified and password set successfully" });
    } else if (purpose === "pharmacist_creation") {
      const { adminEmail, pharmacistEmail } = req.body;

      if (!adminEmail || !pharmacistEmail) {
        return res
          .status(400)
          .json({ message: "adminEmail and pharmacistEmail are required" });
      }

      const validOtp = await Otp.findOne({ email: adminEmail, otp, purpose });
      if (!validOtp)
        return res.status(400).json({ message: "Invalid or expired OTP" });

      const user = await User.findOne({ email: pharmacistEmail });
      if (!user)
        return res.status(404).json({ message: "Pharmacist not found" });

      user.password = await bcrypt.hash(password, 10);
      user.isVerified = true;
      await user.save();

      await Otp.deleteMany({ email: adminEmail, purpose });

      return res
        .status(200)
        .json({ message: "Pharmacist verified and password set successfully" });
    } else {
      return res.status(400).json({ message: "Invalid purpose value" });
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error verifying OTP", error: err.message });
  }
};

exports.login = async (req, res) => {
  console.log("Login endpoint hit");

  const { identifier, password } = req.body;
  console.log("Request Body:", req.body);

  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).populate("enterprise");

    if (!user || !user.isVerified) {
      console.log("User not found or not verified");
      return res
        .status(400)
        .json({ message: "User not found or not verified" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Invalid password");
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 3600000,
    });

    console.log("Login successful for user:", user.username);

    return res.status(200).json({
      message: "Login successful",
      user: {
        userId: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        enterprise: user.enterprise.name,
        enterpriseId: user.enterprise._id,
      },
    });
  } catch (err) {
    console.error("Login failed:", err);
    return res
      .status(500)
      .json({ message: "Login failed", error: err.message });
  }
};

exports.createPharmacist = async (req, res) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const admin = await User.findById(req.user.userId);
  if (!admin || admin.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admin can create users" });
  }

  const { email, fullName, username } = req.body;

  const user = new User({
    fullName,
    username,
    email,
    role: "PHARMACIST",
    enterprise: admin.enterprise,
  });

  await user.save();

  const otp = Math.floor(100000 + Math.random() * 900000);
  await Otp.create({ email, otp, purpose: "pharmacist_creation" });

  const adminEmail = admin.email;
  await sendOtpEmail(adminEmail, `OTP for new Pharmacist: ${otp}`);

  res
    .status(201)
    .json({ message: "Pharmacist created. OTP sent to admin email." });
};

// exports.login = async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: "Invalid credentials" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch)
//       return res.status(400).json({ message: "Invalid credentials" });

//     const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
//       expiresIn: "1h",
//     });

//     // Set HTTP-only cookie
//     res.cookie("token", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       maxAge: 3600000, // 1 hour
//     });

//     // Return user info
//     res.status(200).json({
//       message: "Login successful",
//       user: {
//         userId: user._id,
//         username: user.username,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

exports.logout = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
};
