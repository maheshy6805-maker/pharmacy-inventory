const Product = require("../models/Product");
const ProductMaster = require("../models/ProductMaster");
const paginate = require("../utils/pagination");

exports.addProduct = async (req, res) => {
  try {
    const { products } = req.body; // 🧾 Can be an array or undefined
    const enterpriseId = req.user.enterprise;

    if (req.user.role !== "PHARMACIST" && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized to add products" });
    }

    // Determine if it's a single product or multiple
    const inputProducts = Array.isArray(products) ? products : [req.body];

    // 🧩 Validate each product
    const invalid = inputProducts.find(
      (p) => !p.name || !p.category || !p.price || !p.costPrice || !p.stock
    );
    if (invalid) {
      return res
        .status(400)
        .json({ message: "Missing required fields in one or more products" });
    }

    // 🧾 Build product documents
    const productDocs = inputProducts.map((p) => {
      if (p.cutSelling) {
        if (!p.subUnits || !p.pricePerUnit) {
          throw new Error(
            `For product "${p.name}", subUnits and pricePerUnit are required when cutSelling is enabled`
          );
        }
      }

      return {
        name: p.name,
        brand: p.brand,
        manufacturer: p.manufacturer,
        category: p.category,
        subcategory: p.subcategory,
        salt: p.salt,
        description: p.description,
        price: p.price,
        costPrice: p.costPrice,
        discountPercentage: p.discountPercentage,
        gstPercentage: p.gstPercentage,
        batchNumber: p.batchNumber,
        unit: p.unit,
        stock: p.stock,
        prescriptionRequired: p.prescriptionRequired,
        expiryDate: p.expiryDate,
        cutSelling: !!p.cutSelling,
        subUnits: p.cutSelling ? p.subUnits : 0,
        pricePerUnit: p.cutSelling ? p.pricePerUnit : 0,
        enterprise: enterpriseId,
        image: p.image || null,
      };
    });

    // 💾 Bulk insert
    const savedProducts = await Product.insertMany(productDocs);

    res.status(201).json({
      message: `${savedProducts.length} product(s) added successfully`,
      products: savedProducts,
    });
  } catch (err) {
    console.error("❌ Error adding products:", err);
    res.status(500).json({
      message: "Error adding product(s)",
      error: err.message,
    });
  }
};

exports.getAllProducts = async (req, res) => {
  const {
    category,
    subcategory,
    brand,
    salt,
    name,
    prescriptionRequired,
    page = 1,
    limit = 10,
  } = req.query;

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
    // Fetch and sort products (latest first)
    const products = await Product.find(filters)
      .sort({ createdAt: -1 }) // ✅ Latest first
      .lean();

    // Use your pagination utility
    const result = paginate(products, {}, page, limit);

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Failed to fetch products:", err);
    res.status(500).json({
      message: "Failed to fetch products",
      error: err.message,
    });
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
    // Get all matching products (apply filters here, not in pagination)
    let matchedProducts = await ProductMaster.find(filters);

    // Manual prioritization based on name match (sorting the results)
    if (name) {
      const lowerName = name.toLowerCase();
      const wordRegex = new RegExp(`\\b${lowerName}\\b`, "i");

      const scoreFields = (item) => {
        let score = 0;
        const fields = [
          item.name?.toLowerCase(),
          item.short_composition1?.toLowerCase(),
          item.short_composition2?.toLowerCase(),
        ];

        fields.forEach((field) => {
          if (!field) return;

          // Whole-word match (BEST)
          if (wordRegex.test(field)) {
            score += 200;
          }
          // Exact match
          else if (field === lowerName) {
            score += 150;
          }
          // Starts-with match
          else if (field.startsWith(lowerName)) {
            score += 50;
          }
          // Normal substring match
          else if (field.includes(lowerName)) {
            score += 10;
          }
        });

        return score;
      };

      matchedProducts = matchedProducts.sort((a, b) => {
        return scoreFields(b) - scoreFields(a);
      });
    }

    // Use the pagination utility (pagination is applied AFTER filtering and sorting)
    const result = paginate(matchedProducts, {}, page, limit); // Empty filters here, because filtering is done above

    res.status(200).json(result);
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
