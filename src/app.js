// app.js
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");

const medicineRoutes = require("./routes/medicineRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const billingRoutes = require("./routes/billingRoutes");
const authMiddleware = require("./middlewares/authMiddleware");

// UploadThing
const { uploadRouter } = require("./uploadthing");
const { createRouteHandler } = require("uploadthing/express");

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

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
