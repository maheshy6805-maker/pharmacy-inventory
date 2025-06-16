const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const authCtrl = require("../controllers/authController");
const userCtrl = require("../controllers/userController"); // ⬅️ Make sure this is imported

// Auth-related routes
router.post("/register-enterprise-admin", authCtrl.registerEnterpriseAdmin);
router.post("/verify-otp", authCtrl.verifyOtpAndSetPassword);
router.post("/login", authCtrl.login);
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});
router.post("/resend-otp", authCtrl.resendOtp);

// Protected routes
router.post("/create-user", auth, authCtrl.createPharmacist);

// ✅ Add this route for GET /api/users?enterpriseId=...
router.get("/", auth, userCtrl.getUsersByEnterprise);

module.exports = router;
