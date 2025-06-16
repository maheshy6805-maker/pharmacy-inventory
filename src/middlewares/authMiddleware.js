require("dotenv").config();

const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // No fallback
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token", error: err.message });
  }
};
