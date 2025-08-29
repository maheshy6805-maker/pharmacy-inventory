const app = require("./app");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ✅ register cors before routes
app.use(
  cors({
    origin: ["http://localhost:5173"], // React dev server
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
