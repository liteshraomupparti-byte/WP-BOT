const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const upload = require("../utils/uploads");
const { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } = require("../utils/cloudinary");
const Product = require("../models/Product");

/**
 * Check if MongoDB Atlas connection is currently active (readyState === 1)
 */
function isDatabaseConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

/**
 * Helper to find a product safely by ObjectId or Legacy custom String ID
 */
async function findProductById(idStr) {
  if (!idStr || !isDatabaseConnected()) return null;

  // 1. Check if idStr is a valid 24-character hexadecimal MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(idStr)) {
    const product = await Product.findById(idStr);
    if (product) return product;
  }

  // 2. Fall back to querying by custom_id or String ID (legacy support)
  return await Product.findOne({
    $or: [
      { custom_id: String(idStr) },
      { id: String(idStr) }
    ]
  });
}

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
    let products = [];
    
    if (isDatabaseConnected()) {
      products = await Product.find().sort({ createdAt: -1 });
    } else {
      console.warn("⚠️ MongoDB Atlas is not connected yet.");
    }

    res.render("products", { products });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.render("products", { products: [] });
  }
});

// ============================================================
// Add Product Handler
// ============================================================

router.post("/add-product", upload.single("image"), async (req, res) => {
  try {
    const { category, name, price, description } = req.body;

    if (!req.file) {
      return res.status(400).send("❌ Please select an image from your gallery to upload.");
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #d32f2f;">⚠️ Cloudinary Credentials Missing on Render</h2>
          <p>Image upload requires Cloudinary environment variables.</p>
          <p>Please go to <strong>Render Dashboard > Settings > Environment Variables</strong> and set:</p>
          <ul style="display: inline-block; text-align: left;">
            <li><code>CLOUDINARY_CLOUD_NAME</code></li>
            <li><code>CLOUDINARY_API_KEY</code></li>
            <li><code>CLOUDINARY_API_SECRET</code></li>
          </ul>
          <br><br>
          <a href="/admin/add-product" style="padding: 10px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 5px;">Go Back</a>
        </div>
      `);
    }

    if (!isDatabaseConnected()) {
      return res.status(500).send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #d32f2f;">⚠️ MongoDB Atlas Not Connected</h2>
          <p>The database connection is not active yet.</p>
          <p>Please check your Render Environment Variables for <strong>MONGODB_URI</strong> and verify MongoDB Atlas <strong>Network Access (0.0.0.0/0)</strong>.</p>
          <br>
          <a href="/admin/add-product" style="padding: 10px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 5px;">Go Back</a>
        </div>
      `);
    }

    // Upload image buffer to Cloudinary
    const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer);

    // Save Product to MongoDB
    const customId = Date.now().toString();
    await Product.create({
      custom_id: customId,
      category,
      name,
      price,
      description: description || "",
      image: secure_url,
      cloudinary_id: public_id,
    });

    console.log(`✅ Product Created Successfully: ${name}`);
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
    const product = await findProductById(req.params.id);

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
    const product = await findProductById(req.params.id);

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

    // If new image is uploaded from gallery
    if (req.file) {
      if (!isCloudinaryConfigured()) {
        return res.status(500).send(`
          <div style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2 style="color: #d32f2f;">⚠️ Cloudinary Credentials Missing on Render</h2>
            <p>Please set <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, and <code>CLOUDINARY_API_SECRET</code> in Render Environment Settings.</p>
            <br>
            <a href="/admin/products" style="padding: 10px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 5px;">Back to Products</a>
          </div>
        `);
      }

      // 1. Upload new image buffer to Cloudinary
      const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer);

      // 2. Delete old image from Cloudinary if public_id exists
      if (product.cloudinary_id) {
        await deleteFromCloudinary(product.cloudinary_id);
      }

      // 3. Update image fields
      product.image = secure_url;
      product.cloudinary_id = public_id;
    }

    await product.save();
    console.log(`✅ Product Updated Successfully: ${product.name}`);

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
    const productId = req.params.id;
    const product = await findProductById(productId);

    if (product) {
      // 1. Delete image from Cloudinary if public_id exists
      if (product.cloudinary_id) {
        await deleteFromCloudinary(product.cloudinary_id);
      }

      // 2. Delete document safely using Mongoose deleteOne with _id
      await Product.deleteOne({ _id: product._id });
      console.log(`🗑 Product Deleted Successfully: ${product.name}`);
    } else {
      console.warn(`⚠️ Product not found for deletion: ${productId}`);
    }

    res.redirect("/admin/products");
  } catch (err) {
    console.error("❌ Delete Product Error:", err);
    res.status(500).send(`Delete product failed: ${err.message}`);
  }
});

module.exports = router;