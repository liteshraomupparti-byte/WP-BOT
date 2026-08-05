// ============================================================
// Devika Collections WhatsApp Bot Server
// ============================================================

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");

const connectDB = require("./config/db");
const productStore = require("./utils/productStore");

const app = express();

// ============================================================
// Database Connection
// ============================================================

connectDB();

// ============================================================
// Middleware
// ============================================================

app.use(express.json());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "mummy-shop-secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ============================================================
// Environment Variables
// ============================================================

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ============================================================
// Meta Webhook Verification
// ============================================================

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook Verified Successfully");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// ============================================================
// Incoming WhatsApp Webhook Messages
// ============================================================

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    console.log("📩 Incoming Webhook Payload:", JSON.stringify(req.body, null, 2));

    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;

    const from = message.from;

    // ===============================
    // TEXT MESSAGE
    // ===============================
    if (message.type === "text") {
      const text = message.text.body.trim().toLowerCase();

      if (["hi", "hello", "hey", "menu", "namaste"].includes(text)) {
        return await sendMainMenu(from);
      }

      return await handleFreeText(from, message.text.body);
    }

    // ===============================
    // INTERACTIVE MESSAGE
    // ===============================
    if (message.type === "interactive") {
      const selectedId =
        message.interactive?.list_reply?.id ||
        message.interactive?.button_reply?.id;

      if (!selectedId) return;

      console.log("👉 User Selected ID:", selectedId);

      // ===========================
      // BUY NOW BUTTON
      // ===========================
      if (selectedId.startsWith("BUY_")) {
        return await handleBuyNow(from, selectedId.replace("BUY_", ""));
      }

      // ===========================
      // CATEGORY SELECTION
      // ===========================
      return await handleMenuSelection(from, selectedId);
    }
  } catch (err) {
    console.error(
      "❌ Webhook Error:",
      err.response?.data || err.message
    );
  }
});

// ============================================================
// Main Category Menu
// ============================================================

async function sendMainMenu(to) {
  const rows = [
    {
      id: "CAT_Sarees",
      title: "👗 Sarees",
      description: "Premium Saree Collection",
    },
    {
      id: "CAT_Lehengas",
      title: "👑 Lehengas",
      description: "Designer Lehengas",
    },
    {
      id: "CAT_Jewellery",
      title: "💎 Jewellery",
      description: "Premium Jewellery",
    },
    {
      id: "CAT_Exclusive Collection",
      title: "✨ Exclusive Collection",
      description: "Premium Products",
    },
  ];

  await sendWhatsAppMessage(to, {
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Devika Collections",
      },
      body: {
        text: `✨ Welcome to Devika Collections\n\nPlease choose a collection below.`,
      },
      footer: {
        text: "Premium Fashion Collection",
      },
      action: {
        button: "View Collections",
        sections: [
          {
            title: "Categories",
            rows,
          },
        ],
      },
    },
  });
}

// ============================================================
// Handle Category Selection (Hybrid Store Query)
// ============================================================

async function handleMenuSelection(to, selectedId) {
  if (!selectedId) {
    return sendMainMenu(to);
  }

  const category = selectedId.replace("CAT_", "");
  const filteredProducts = await productStore.getAllProducts(category);

  if (filteredProducts.length === 0) {
    return await sendWhatsAppMessage(to, {
      type: "text",
      text: {
        body: "❌ No products are available in this category.",
      },
    });
  }

  // Send interactive card for every product found
  for (const product of filteredProducts) {
    const prodId = product._id ? product._id.toString() : (product.id || product.custom_id);
    await sendWhatsAppMessage(to, {
      type: "interactive",
      interactive: {
        type: "button",
        header: {
          type: "image",
          image: {
            link: product.image, // Secure Cloudinary HTTPS URL
          },
        },
        body: {
          text: `${product.name}\n\n💰 Price : ₹${product.price}${
            product.description ? `\n\n📝 ${product.description}` : ""
          }`,
        },
        footer: {
          text: "Devika Collections",
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: {
                id: `BUY_${prodId}`,
                title: "🛒 Buy Now",
              },
            },
          ],
        },
      },
    });
  }

  // End of Category notification message
  await sendWhatsAppMessage(to, {
    type: "text",
    text: {
      body: `✅ End of ${category} Collection\n\nType "menu" anytime to browse other collections.`,
    },
  });
}

// ============================================================
// Handle Buy Now (Hybrid Store Query)
// ============================================================

async function handleBuyNow(to, productId) {
  const product = await productStore.getProductById(productId);

  if (!product) {
    return await sendWhatsAppMessage(to, {
      type: "text",
      text: {
        body: "❌ Product not found.",
      },
    });
  }

  // Customer Confirmation Message
  await sendWhatsAppMessage(to, {
    type: "text",
    text: {
      body: `✅ Thank you for your interest!\n\nYour request has been sent to Devika Collections.\n\nOur team will contact you shortly.`,
    },
  });

  // Notify Shop Owner with Product & Image
  await sendWhatsAppMessage("916260741302", {
    type: "image",
    image: {
      link: product.image,
      caption: `🛍 NEW CUSTOMER ORDER REQUEST\n\n👤 Customer Phone:\n+${to}\n\n📦 Product:\n${product.name}\n\n💰 Price:\n₹${product.price}\n\nCategory:\n${product.category}\n\nPlease contact the customer promptly.`,
    },
  });
}

// ============================================================
// Free Text Handler
// ============================================================

async function handleFreeText(to, userText) {
  await sendWhatsAppMessage(to, {
    type: "text",
    text: {
      body: `🙏 Thank you for your message.\n\nA member of Devika Collections will contact you soon.\n\nType "menu" anytime to browse our collections.`,
    },
  });
}

// ============================================================
// Send WhatsApp Graph API Message Helper
// ============================================================

async function sendWhatsAppMessage(to, payload) {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        ...payload,
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error(
      "❌ Send WhatsApp Message Error:",
      err.response?.data || err.message
    );
  }
}

// ============================================================
// Admin Dashboard Sub-Router
// ============================================================

const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);

// ============================================================
// Start Express Server
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Bot server running on port ${PORT}`);
});
