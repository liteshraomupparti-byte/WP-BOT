const express = require("express");
const router = express.Router();
const upload = require("../utils/uploads");
const { uploadToCloudinary, deleteFromCloudinary, isCloudinaryConfigured } = require("../utils/cloudinary");
const productStore = require("../utils/productStore");

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
    const products = await productStore.getAllProducts();
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

    // Upload image buffer to Cloudinary
    const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer);

    // Save Product through hybrid product store (MongoDB Atlas or JSON fallback)
    await productStore.createProduct({
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
    const product = await productStore.getProductById(req.params.id);

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
    const productId = req.params.id;
    const existingProduct = await productStore.getProductById(productId);

    if (!existingProduct) {
      return res.status(404).send("Product not found");
    }

    let newImage = null;

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
      newImage = await uploadToCloudinary(req.file.buffer);

      // 2. Delete old image from Cloudinary if public_id exists
      if (existingProduct.cloudinary_id) {
        await deleteFromCloudinary(existingProduct.cloudinary_id);
      }
    }

    // 3. Update product in product store
    await productStore.updateProduct(productId, req.body, newImage);
    console.log(`✅ Product Updated Successfully: ${req.body.name || existingProduct.name}`);

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
    const product = await productStore.getProductById(productId);

    if (product && product.cloudinary_id) {
      await deleteFromCloudinary(product.cloudinary_id);
    }

    await productStore.deleteProduct(productId);
    console.log(`🗑 Product Deleted Successfully`);

    res.redirect("/admin/products");
  } catch (err) {
    console.error("❌ Delete Product Error:", err);
    res.status(500).send(`Delete product failed: ${err.message}`);
  }
});

module.exports = router;