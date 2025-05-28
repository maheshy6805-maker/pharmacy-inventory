const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
require("dotenv").config();

module.exports = function (req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId: ... }
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token", error: err.message });
  }
};
