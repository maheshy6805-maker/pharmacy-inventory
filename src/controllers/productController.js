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
    name,
    page = 1,
    limit = 10,
  } = req.query;

  const filters = {};

  if (Is_discontinued) filters.Is_discontinued = Is_discontinued;
  if (manufacturer_name) filters.manufacturer_name = manufacturer_name;
  if (type) filters.type = type;

  let searchRegex;
  if (name) {
    searchRegex = new RegExp(name, "i"); // case-insensitive regex
    // Match any of the 3 fields
    filters.$or = [
      { name: searchRegex },
      { short_composition1: searchRegex },
      { short_composition2: searchRegex },
    ];
  }

  try {
    // Get all matching products (no pagination yet)
    let matchedProducts = await ProductMaster.find(filters);

    // Manual prioritization
    if (name) {
      matchedProducts = matchedProducts.sort((a, b) => {
        const aNameMatch = a.name.match(searchRegex) ? 1 : 0;
        const bNameMatch = b.name.match(searchRegex) ? 1 : 0;

        const aShort1Match = a.short_composition1?.match(searchRegex) ? 1 : 0;
        const bShort1Match = b.short_composition1?.match(searchRegex) ? 1 : 0;

        const aShort2Match = a.short_composition2?.match(searchRegex) ? 1 : 0;
        const bShort2Match = b.short_composition2?.match(searchRegex) ? 1 : 0;

        const aScore = aNameMatch * 3 + aShort1Match * 2 + aShort2Match;
        const bScore = bNameMatch * 3 + bShort1Match * 2 + bShort2Match;

        return bScore - aScore; // descending
      });
    }

    const total = matchedProducts.length;

    // Manual pagination
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const paginatedData = matchedProducts.slice(
      (pageNumber - 1) * pageSize,
      pageNumber * pageSize
    );

    res.status(200).json({
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      data: paginatedData,
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
