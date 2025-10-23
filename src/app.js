// // app.js
// const express = require("express");
// const app = express();
// const cookieParser = require("cookie-parser");

// const medicineRoutes = require("./routes/medicineRoutes");
// const authRoutes = require("./routes/authRoutes");
// const userRoutes = require("./routes/userRoutes");
// const productRoutes = require("./routes/productRoutes");
// const billingRoutes = require("./routes/billingRoutes");
// const purchaseRoutes = require("./routes/purchaseRoutes"); // 🔽 added
// const authMiddleware = require("./middlewares/authMiddleware");

// // UploadThing
// const { uploadRouter } = require("./uploadthing");
// const uploadRoutes = require("./routes/uploadRoutes");
// const { createRouteHandler } = require("uploadthing/express");

// app.use(express.json());
// app.use(cookieParser());

// app.use("/api/auth", authRoutes);

// // app.use(
// //   "/api/uploadthing",
// //   authMiddleware,
// //   createRouteHandler({ router: uploadRouter })
// // );

// app.use("/api/csv-import", authMiddleware, uploadRoutes);
// // other protected routes
// app.use("/api/medicines", authMiddleware, medicineRoutes);
// app.use("/api/users", authMiddleware, userRoutes);
// app.use("/api/products", authMiddleware, productRoutes);
// app.use("/api/bills", authMiddleware, billingRoutes);
// app.use("/api/purchases", authMiddleware, purchaseRoutes); // 🔽 added

// module.exports = app;

const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path"); // 👈 add this

const medicineRoutes = require("./routes/medicineRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const billingRoutes = require("./routes/billingRoutes");
const purchaseBillRoutes = require("./routes/purchaseBillRoutes"); // ✅ updated
const customerRoutes = require("./routes/customerRoutes"); // ✅ updated
const authMiddleware = require("./middlewares/authMiddleware");

// UploadThing
const { uploadRouter } = require("./uploadthing");
const uploadRoutes = require("./routes/uploadRoutes");
const { createRouteHandler } = require("uploadthing/express");

app.use(express.json());
app.use(cookieParser());

// ✅ Serve static PDF files from "uploads" directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);

app.use("/api/csv-import", authMiddleware, uploadRoutes);

// ✅ Protected routes
app.use("/api/medicines", authMiddleware, medicineRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/products", authMiddleware, productRoutes);
app.use("/api/bills", authMiddleware, billingRoutes);
app.use("/api/purchase-bills", authMiddleware, purchaseBillRoutes);
app.use("/api/customers", authMiddleware, customerRoutes);

module.exports = app;
