const User = require("../models/User");

exports.getUsersByEnterprise = async (req, res) => {
  const { enterpriseId } = req.query;

  if (!enterpriseId) {
    return res.status(400).json({ message: "enterpriseId is required" });
  }

  try {
    const users = await User.find({ enterprise: enterpriseId }).select(
      "-password" // Exclude password from response
    );

    res.status(200).json({ users });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: err.message });
  }
};
