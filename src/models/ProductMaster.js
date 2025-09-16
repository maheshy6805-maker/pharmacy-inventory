const mongoose = require("mongoose");

const productMasterSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: String, // Could be Number, but stored as string with ₹ symbol
      alias: "price(₹)",
    },
    Is_discontinued: {
      type: String, // Could be Boolean, but you have "TRUE"/"FALSE" strings
      enum: ["TRUE", "FALSE"],
    },
    manufacturer_name: {
      type: String,
    },
    type: {
      type: String,
    },
    pack_size_label: {
      type: String,
    },
    short_composition1: {
      type: String,
    },
    short_composition2: {
      type: String,
    },
  },
  {
    collection: "productMaster", // Explicitly match the collection name in Atlas
    versionKey: false,
  }
);

module.exports = mongoose.model("ProductMaster", productMasterSchema);
