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

/**
 * @swagger
 * tags:
 *   name: User
 *   description: Authentication and user management APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "6710b6e5f02b51b44d4d1a7e"
 *         fullName:
 *           type: string
 *           example: "John Doe"
 *         username:
 *           type: string
 *           example: "john_doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         aadhaar:
 *           type: string
 *           example: "1234-5678-9123"
 *         role:
 *           type: string
 *           enum: [ADMIN, PHARMACIST]
 *           example: "PHARMACIST"
 *         enterprise:
 *           type: string
 *           description: Reference to enterprise
 *           example: "66f09d29a4b6a5a3e1d0b9f2"
 *         isVerified:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users/register-enterprise-admin:
 *   post:
 *     summary: Register a new enterprise admin (with OTP verification)
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - username
 *               - email
 *               - enterpriseName
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Alice Singh"
 *               username:
 *                 type: string
 *                 example: "alice_admin"
 *               email:
 *                 type: string
 *                 example: "alice@example.com"
 *               enterpriseName:
 *                 type: string
 *                 example: "Pharmalogy Store"
 *     responses:
 *       200:
 *         description: OTP sent to email for verification
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Failed to register admin
 */

/**
 * @swagger
 * /api/users/verify-otp:
 *   post:
 *     summary: Verify OTP and set password for a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "alice@example.com"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               password:
 *                 type: string
 *                 example: "MyStrongPassword123"
 *     responses:
 *       200:
 *         description: Account verified and password set successfully
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Verification failed
 */

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login and receive JWT token
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "alice_admin"
 *               password:
 *                 type: string
 *                 example: "MyStrongPassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Login failed
 */

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Logout and clear JWT token cookie
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */

/**
 * @swagger
 * /api/users/resend-otp:
 *   post:
 *     summary: Resend OTP to registered email
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "alice@example.com"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Email not found
 *       500:
 *         description: Failed to resend OTP
 */

/**
 * @swagger
 * /api/users/create-user:
 *   post:
 *     summary: Create a new pharmacist under an enterprise (Admin only)
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - username
 *               - email
 *               - role
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Ravi Kumar"
 *               username:
 *                 type: string
 *                 example: "ravi_pharma"
 *               email:
 *                 type: string
 *                 example: "ravi@example.com"
 *               aadhaar:
 *                 type: string
 *                 example: "5678-1234-9876"
 *               role:
 *                 type: string
 *                 enum: [PHARMACIST]
 *                 example: "PHARMACIST"
 *     responses:
 *       201:
 *         description: Pharmacist user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid or missing data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to create user
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users for an enterprise
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: enterpriseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The enterprise ID to fetch users for
 *     responses:
 *       200:
 *         description: List of users for the enterprise
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing enterpriseId
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch users
 */

module.exports = router;
