const multer = require("multer");
const path = require("path");
const fs = require("fs");
const express = require("express");
const router = express.Router();

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

// Products Page
router.get("/products", (req, res) => {

const productsFile="./database/products.json";

let products=[];

if(fs.existsSync(productsFile)){

products=JSON.parse(fs.readFileSync(productsFile));

}

res.render("products", { products });
});
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/add-product", upload.single("image"), (req, res) => {
    const productsFile = "./database/products.json";

let products = [];

if (fs.existsSync(productsFile)) {
  products = JSON.parse(fs.readFileSync(productsFile));
}

products.push({
  id: Date.now(),

  category: req.body.category,

  name: req.body.name,

  price: req.body.price,

  image: process.env.BASE_URL + "/uploads/" + req.file.filename
});

fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

res.redirect("/admin/products");
});

// Delete Product
router.post("/delete/:id", (req, res) => {

    const productsFile = "./database/products.json";

    let products = JSON.parse(fs.readFileSync(productsFile));

    products = products.filter(p => p.id != req.params.id);

    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

    res.redirect("/admin/products");
});


// Edit Product Page
router.get("/edit-product/:id", (req, res) => {

    const productsFile = "./database/products.json";

    let products = JSON.parse(fs.readFileSync(productsFile));

    const product = products.find(p => p.id == req.params.id);

    if (!product) {
        return res.send("Product not found");
    }

    res.render("edit-product", { product });

});


// Update Product
router.post("/edit-product/:id", upload.single("image"), (req, res) => {

    const productsFile = "./database/products.json";

    let products = JSON.parse(fs.readFileSync(productsFile));

    const index = products.findIndex(p => p.id == req.params.id);

    if (index === -1) {
        return res.send("Product not found");
    }

    products[index].category = req.body.category;
    products[index].name = req.body.name;
    products[index].price = req.body.price;

    if (req.file) {
        products[index].image = "/uploads/" + req.file.filename;
    }

    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

    res.redirect("/admin/products");

});

module.exports = router;