const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Product = require("../models/Product");

const jsonFilePath = path.join(__dirname, "../database/products.json");

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

function readJsonProducts() {
  try {
    if (!fs.existsSync(jsonFilePath)) return [];
    const data = fs.readFileSync(jsonFilePath, "utf8");
    return data.trim() ? JSON.parse(data) : [];
  } catch (err) {
    console.error("❌ Error reading products.json:", err);
    return [];
  }
}

function writeJsonProducts(products) {
  try {
    const dir = path.dirname(jsonFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(jsonFilePath, JSON.stringify(products, null, 2));
  } catch (err) {
    console.error("❌ Error writing products.json:", err);
  }
}

/**
 * Get all products (from MongoDB Atlas if connected, else fallback to JSON)
 */
async function getAllProducts(category = null) {
  if (isMongoConnected()) {
    try {
      const query = category ? { category: new RegExp("^" + category + "$", "i") } : {};
      return await Product.find(query).sort({ createdAt: -1 });
    } catch (err) {
      console.warn("⚠️ MongoDB query failed, falling back to JSON storage:", err.message);
    }
  }

  let products = readJsonProducts();
  if (category) {
    products = products.filter(
      (p) => p.category && p.category.toLowerCase() === category.toLowerCase()
    );
  }
  return products;
}

/**
 * Create product (in MongoDB Atlas if connected, else fallback to JSON)
 */
async function createProduct(data) {
  const customId = Date.now().toString();
  const productData = {
    id: customId,
    custom_id: customId,
    category: data.category,
    name: data.name,
    price: data.price,
    description: data.description || "",
    image: data.image,
    cloudinary_id: data.cloudinary_id || "",
    createdAt: new Date(),
  };

  if (isMongoConnected()) {
    try {
      return await Product.create(productData);
    } catch (err) {
      console.warn("⚠️ MongoDB create failed, saving to JSON storage:", err.message);
    }
  }

  const products = readJsonProducts();
  products.unshift(productData);
  writeJsonProducts(products);
  return productData;
}

/**
 * Get single product by ID
 */
async function getProductById(idStr) {
  if (!idStr) return null;

  if (isMongoConnected()) {
    try {
      if (mongoose.Types.ObjectId.isValid(idStr)) {
        const prod = await Product.findById(idStr);
        if (prod) return prod;
      }
      const prod = await Product.findOne({
        $or: [{ custom_id: String(idStr) }, { id: String(idStr) }],
      });
      if (prod) return prod;
    } catch (err) {
      console.warn("⚠️ MongoDB findById failed:", err.message);
    }
  }

  const products = readJsonProducts();
  return products.find(
    (p) =>
      String(p.id) === String(idStr) ||
      String(p.custom_id) === String(idStr) ||
      String(p._id) === String(idStr)
  );
}

/**
 * Update product by ID
 */
async function updateProduct(idStr, updateData, newImage = null) {
  const product = await getProductById(idStr);
  if (!product) return null;

  if (isMongoConnected() && product._id) {
    try {
      const prodDoc = await Product.findById(product._id);
      if (prodDoc) {
        prodDoc.category = updateData.category || prodDoc.category;
        prodDoc.name = updateData.name || prodDoc.name;
        prodDoc.price = updateData.price || prodDoc.price;
        if (updateData.description !== undefined) {
          prodDoc.description = updateData.description;
        }
        if (newImage) {
          prodDoc.image = newImage.secure_url;
          prodDoc.cloudinary_id = newImage.public_id;
        }
        await prodDoc.save();
        return prodDoc;
      }
    } catch (err) {
      console.warn("⚠️ MongoDB update failed:", err.message);
    }
  }

  // Update in JSON fallback
  const products = readJsonProducts();
  const index = products.findIndex(
    (p) =>
      String(p.id) === String(idStr) ||
      String(p.custom_id) === String(idStr) ||
      String(p._id) === String(idStr)
  );
  if (index !== -1) {
    products[index].category = updateData.category || products[index].category;
    products[index].name = updateData.name || products[index].name;
    products[index].price = updateData.price || products[index].price;
    if (updateData.description !== undefined) {
      products[index].description = updateData.description;
    }
    if (newImage) {
      products[index].image = newImage.secure_url;
      products[index].cloudinary_id = newImage.public_id;
    }
    writeJsonProducts(products);
    return products[index];
  }
  return null;
}

/**
 * Delete product by ID
 */
async function deleteProduct(idStr) {
  const product = await getProductById(idStr);
  if (!product) return false;

  if (isMongoConnected() && product._id) {
    try {
      await Product.deleteOne({ _id: product._id });
    } catch (err) {
      console.warn("⚠️ MongoDB delete failed:", err.message);
    }
  }

  let products = readJsonProducts();
  products = products.filter(
    (p) =>
      String(p.id) !== String(idStr) &&
      String(p.custom_id) !== String(idStr) &&
      String(p._id) !== String(idStr)
  );
  writeJsonProducts(products);
  return true;
}

module.exports = {
  isMongoConnected,
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
};
