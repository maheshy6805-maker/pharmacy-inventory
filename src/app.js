const express = require("express");
const app = express();
const medicineRoutes = require("./routes/medicineRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const cookieParser = require("cookie-parser");
const authMiddleware = require("./middlewares/authMiddleware");

app.use(express.json());

app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.use("/api/medicines", authMiddleware, medicineRoutes);

app.use("/api/users", authMiddleware, userRoutes);

module.exports = app;
