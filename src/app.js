// app.js
const express = require("express");
const app = express();
const medicineRoutes = require("./routes/medicineRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const billingRoutes = require("./routes/billingRoutes");
const cookieParser = require("cookie-parser");
const authMiddleware = require("./middlewares/authMiddleware");

// UploadThing route handler
const { createRouteHandler } = require("uploadthing/express");
const { uploadRouter } = require("./uploadthing"); // file we created above

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

// Mount UploadThing BEFORE other protected routes so req.user is available in its middleware.
// Apply authMiddleware if you want uploads to be authenticated.
app.use(
  "/api/uploadthing",
  authMiddleware,
  createRouteHandler({ router: uploadRouter })
);

// other protected routes
app.use("/api/medicines", authMiddleware, medicineRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/products", authMiddleware, productRoutes);
app.use("/api/bills", authMiddleware, billingRoutes);

module.exports = app;
