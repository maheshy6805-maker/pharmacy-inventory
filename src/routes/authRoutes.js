// const express = require("express");
// const router = express.Router();
// const { register, login, logout } = require("../controllers/authController");

// router.post("/register", register);
// router.post("/login", login);
// router.post("/logout", logout);

// module.exports = router;

const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const authCtrl = require("../controllers/authController");

router.post("/register-enterprise-admin", authCtrl.registerEnterpriseAdmin);
router.post("/verify-otp", authCtrl.verifyOtpAndSetPassword);
router.post("/login", authCtrl.login);
router.post("/create-user", auth, authCtrl.createPharmacist);
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});
router.get("/check-session", auth, authCtrl.checkSession);

// ✅ Add this route for OTP resend
router.post("/resend-otp", authCtrl.resendOtp);

module.exports = router;
