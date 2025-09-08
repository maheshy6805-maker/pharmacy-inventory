// server.js (top of file)
const app = require("./app");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ✅ register cors before routes
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://app.pharmalogy.co.in", // vercel domain
    ],
    credentials: true,
  })
);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection failed:", err));
