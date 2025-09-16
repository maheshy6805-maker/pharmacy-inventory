const express = require("express");
const router = express.Router();
const productCtrl = require("../controllers/productController");
const auth = require("../middlewares/authMiddleware");

router.post("/add", auth, productCtrl.addProduct);
router.get("/", auth, productCtrl.getAllProducts);
router.get("/masterProducts", auth, productCtrl.getAllMasterProducts);
router.put("/:id/update", auth, productCtrl.updateProduct);
router.delete("/:id", auth, productCtrl.deleteProduct);

module.exports = router;
