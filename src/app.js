const express = require("express");
const app = express();
const medicineRoutes = require("./routes/medicineRoutes");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middlewares/authMiddleware");
const cookieParser = require("cookie-parser");

app.use(express.json());

app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.use("/api/medicines", authMiddleware, medicineRoutes);

module.exports = app;
