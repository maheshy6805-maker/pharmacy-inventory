// scripts/seed.js
const mongoose = require("mongoose");
const Medicine = require("../pharmacy-inventory/src/models/Medicine");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await Medicine.insertMany([
    {
      name: "Paracetamol",
      salt: "Acetaminophen",
      company: "Cipla",
      price: 10,
      stock: 200,
    },
    {
      name: "Amoxicillin",
      salt: "Penicillin",
      company: "Sun Pharma",
      price: 25,
      stock: 100,
    },
  ]);
  console.log("Sample data inserted");
  mongoose.disconnect();
});
