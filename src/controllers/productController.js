const Product = require("../models/Product");
const ProductMaster = require("../models/ProductMaster");

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
    image, // 🔽 accept image from body
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

      // 🔽 Save image object if provided
      image: image || null,
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

    // 🔽 They already include `image` field
    res.status(200).json({ products });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch products", error: err.message });
  }
};
exports.getAllMasterProducts = async (req, res) => {
  const {
    Is_discontinued,
    manufacturer_name,
    type,
    short_composition1,
    short_composition2,
    name,
    page = 1,
    limit = 10,
  } = req.query;

  const filters = {};

  if (Is_discontinued) filters.Is_discontinued = Is_discontinued;
  if (manufacturer_name) filters.manufacturer_name = manufacturer_name;
  if (type) filters.type = type;
  if (short_composition1) filters.short_composition1 = short_composition1;
  if (short_composition2) filters.short_composition2 = short_composition2;

  if (name) {
    filters.name = { $regex: name, $options: "i" }; // case-insensitive
  }

  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);
  const skip = (pageNumber - 1) * pageSize;

  try {
    const [masterProducts, total] = await Promise.all([
      ProductMaster.find(filters).skip(skip).limit(pageSize),
      ProductMaster.countDocuments(filters),
    ]);

    res.status(200).json({
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      data: masterProducts,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: err.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can update stock" });
  }

  const allowedFields = [
    "name",
    "brand",
    "manufacturer",
    "category",
    "subcategory",
    "salt",
    "description",
    "price",
    "costPrice",
    "discountPercentage",
    "gstPercentage",
    "batchNumber",
    "unit",
    "stock",
    "prescriptionRequired",
    "expiryDate",
    "cutSelling",
    "subUnits",
    "pricePerUnit",
    "image",
  ];

  // Build the update object dynamically
  const updateData = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  // Optional: Validate required fields if it's a full update
  if (
    !updateData.name ||
    !updateData.category ||
    updateData.price === undefined ||
    updateData.costPrice === undefined ||
    updateData.stock === undefined
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, enterprise: req.user.enterprise },
      { $set: updateData },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product updated", product });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update product", error: err.message });
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
