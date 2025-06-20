const Product = require("../models/Product");

exports.addProduct = async (req, res) => {
  const {
    name,
    brand,
    manufacturer,
    category,
    subcategory,
    salt,
    description,
    price,
    costPrice,
    discountPercentage,
    gstPercentage,
    batchNumber,
    unit,
    stock,
    prescriptionRequired,
    expiryDate,
    cutSelling,
    subUnits,
    pricePerUnit,
  } = req.body;

  const enterpriseId = req.user.enterprise;

  if (!name || !category || !price || !costPrice || !stock) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (req.user.role !== "PHARMACIST" && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Unauthorized to add products" });
  }

  // Cut selling validation
  if (cutSelling) {
    if (!subUnits || !pricePerUnit) {
      return res.status(400).json({
        message: "For cut selling, subUnits and pricePerUnit are required",
      });
    }
  }

  try {
    const newProduct = new Product({
      name,
      brand,
      manufacturer,
      category,
      subcategory,
      salt,
      description,
      price,
      costPrice,
      discountPercentage,
      gstPercentage,
      batchNumber,
      unit,
      stock,
      prescriptionRequired,
      expiryDate,
      cutSelling: !!cutSelling,
      subUnits: cutSelling ? subUnits : 0,
      pricePerUnit: cutSelling ? pricePerUnit : 0,
      enterprise: enterpriseId,
    });

    const savedProduct = await newProduct.save();

    res
      .status(201)
      .json({ message: "Product added successfully", product: savedProduct });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error adding product", error: err.message });
  }
};
exports.getAllProducts = async (req, res) => {
  const { category, subcategory, brand, salt, name, prescriptionRequired } =
    req.query;

  const filters = {};

  if (category) filters.category = category;
  if (subcategory) filters.subcategory = subcategory;
  if (brand) filters.brand = brand;
  if (salt) filters.salt = salt;
  if (prescriptionRequired !== undefined) {
    filters.prescriptionRequired = prescriptionRequired === "true";
  }

  if (name) {
    filters.name = { $regex: name, $options: "i" }; // case-insensitive search
  }

  // Restrict to the user's enterprise
  filters.enterprise = req.user.enterprise;

  try {
    const products = await Product.find(filters);
    res.status(200).json({ products });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch products", error: err.message });
  }
};

exports.updateStock = async (req, res) => {
  const { stock } = req.body;

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can update stock" });
  }

  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, enterprise: req.user.enterprise },
      { $set: { stock } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Stock updated", product });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update stock", error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can delete products" });
  }

  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      enterprise: req.user.enterprise,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete product", error: err.message });
  }
};
