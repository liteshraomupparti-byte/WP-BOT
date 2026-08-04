const express = require("express");
const router = express.Router();
const upload = require("../utils/uploads");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");
const Product = require("../models/Product");

// ============================================================
// Admin Login & Dashboard Routes
// ============================================================

// Login Page
router.get("/", (req, res) => {
  res.render("login");
});

// Dashboard
router.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

// Add Product Page
router.get("/add-product", (req, res) => {
  res.render("add-product");
});

// ============================================================
// Products List Route
// ============================================================

router.get("/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render("products", { products });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).send("Error loading products");
  }
});

// ============================================================
// Add Product Handler
// ============================================================

router.post("/add-product", upload.single("image"), async (req, res) => {
  try {
    const { category, name, price, description } = req.body;

    if (!req.file) {
      return res.status(400).send("Please select an image to upload.");
    }

    // Upload image to Cloudinary
    const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer);

    // Save Product to MongoDB
    await Product.create({
      category,
      name,
      price,
      description: description || "",
      image: secure_url,
      cloudinary_id: public_id,
    });

    console.log(`✅ Product Created: ${name}`);
    res.redirect("/admin/products");
  } catch (err) {
    console.error("❌ Add Product Error:", err);
    res.status(500).send(`Add product failed: ${err.message}`);
  }
});

// ============================================================
// Edit Product Page
// ============================================================

router.get("/edit-product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("edit-product", { product });
  } catch (err) {
    console.error("❌ Edit Product Page Error:", err);
    res.status(500).send("Error loading product");
  }
});

// ============================================================
// Update Product Handler
// ============================================================

router.post("/edit-product/:id", upload.single("image"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Update text fields
    product.category = req.body.category || product.category;
    product.name = req.body.name || product.name;
    product.price = req.body.price || product.price;
    if (req.body.description !== undefined) {
      product.description = req.body.description;
    }

    // If new image is uploaded
    if (req.file) {
      // 1. Upload new image to Cloudinary
      const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer);

      // 2. Delete old image from Cloudinary
      if (product.cloudinary_id) {
        await deleteFromCloudinary(product.cloudinary_id);
      }

      // 3. Update image URLs
      product.image = secure_url;
      product.cloudinary_id = public_id;
    }

    await product.save();
    console.log(`✅ Product Updated: ${product.name}`);

    res.redirect("/admin/products");
  } catch (err) {
    console.error("❌ Update Product Error:", err);
    res.status(500).send(`Update product failed: ${err.message}`);
  }
});

// ============================================================
// Delete Product Handler
// ============================================================

router.post("/delete/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // 1. Delete image from Cloudinary
    if (product.cloudinary_id) {
      await deleteFromCloudinary(product.cloudinary_id);
    }

    // 2. Delete document from MongoDB
    await Product.findByIdAndDelete(req.params.id);

    console.log(`🗑 Product Deleted: ${product.name}`);
    res.redirect("/admin/products");
  } catch (err) {
    console.error("❌ Delete Product Error:", err);
    res.status(500).send(`Delete product failed: ${err.message}`);
  }
});

module.exports = router;