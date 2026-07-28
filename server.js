// ============================================================
// Devika Collections WhatsApp Bot
// Server.js (Part 1)
// ============================================================

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();

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
    secret: "mummy-shop-secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.set("view engine", "ejs");

app.set(
  "views",
  path.join(__dirname, "views")
);

// ============================================================
// Environment Variables
// ============================================================

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

const PHONE_NUMBER_ID =
  process.env.PHONE_NUMBER_ID;

// ============================================================
// Load Products
// ============================================================

function loadProducts() {

  const file = path.join(
    __dirname,
    "database",
    "products.json"
  );

  if (!fs.existsSync(file)) {

    return [];

  }

  const raw = fs.readFileSync(
    file,
    "utf8"
  );

  if (!raw.trim()) {

    return [];

  }

  return JSON.parse(raw);

}

// ============================================================
// Meta Webhook Verification
// ============================================================

app.get("/webhook", (req, res) => {

  const mode =
    req.query["hub.mode"];

  const token =
    req.query["hub.verify_token"];

  const challenge =
    req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN
  ) {

    console.log(
      "✅ Webhook Verified Successfully"
    );

    return res
      .status(200)
      .send(challenge);

  }

  return res.sendStatus(403);

});

// ============================================================
// Incoming Messages
// ============================================================

app.post("/webhook", async (req, res) => {

  res.sendStatus(200);

  try {

    console.log(JSON.stringify(req.body, null, 2));

    const message =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return;

    const from = message.from;

    // ===============================
    // TEXT MESSAGE
    // ===============================

    if (message.type === "text") {

      const text =
        message.text.body
          .trim()
          .toLowerCase();

      if (
        [
          "hi",
          "hello",
          "hey",
          "menu",
          "namaste"
        ].includes(text)
      ) {

        return await sendMainMenu(from);

      }

      return await handleFreeText(
        from,
        message.text.body
      );

    }

    // ===============================
    // INTERACTIVE
    // ===============================

    if (message.type === "interactive") {

      const selectedId =
        message.interactive?.list_reply?.id ||
        message.interactive?.button_reply?.id;

      if (!selectedId) return;

      console.log(
        "Selected:",
        selectedId
      );

      // ===========================
      // BUY NOW BUTTON
      // ===========================

      if (
        selectedId.startsWith("BUY_")
      ) {

        return await handleBuyNow(
          from,
          selectedId.replace(
            "BUY_",
            ""
          )
        );

      }

      // ===========================
      // CATEGORY
      // ===========================

      return await handleMenuSelection(
        from,
        selectedId
      );

    }

  }

  catch (err) {

    console.error(
      "Webhook Error:",
      err.response?.data ||
      err.message
    );

  }

});

// ============================================================
// Main Menu
// ============================================================

async function sendMainMenu(to) {

  const rows = [

    {
      id: "CAT_Sarees",
      title: "👗 Sarees",
      description: "Premium Saree Collection"
    },

    {
      id: "CAT_Lehengas",
      title: "👑 Lehengas",
      description: "Designer Lehengas"
    },

    {
      id: "CAT_Jewellery",
      title: "💎 Jewellery",
      description: "Premium Jewellery"
    },

    {
      id: "CAT_Exclusive Collection",
      title: "✨ Exclusive Collection",
      description: "Premium Products"
    }

  ];

  await sendWhatsAppMessage(to, {

    type: "interactive",

    interactive: {

      type: "list",

      header: {
        type: "text",
        text: "Devika Collections"
      },

      body: {
        text:
`✨ Welcome to Devika Collections

Please choose a collection below.`
      },

      footer: {
        text: "Premium Fashion Collection"
      },

      action: {

        button: "View Collections",

        sections: [

          {

            title: "Categories",

            rows

          }

        ]

      }

    }

  });

}

// ============================================================
// Handle Category Selection
// ============================================================

async function handleMenuSelection(to, selectedId) {

  if (!selectedId) {

    return sendMainMenu(to);

  }

  const category =
    selectedId.replace("CAT_", "");

  const products =
    loadProducts();

  const filteredProducts =
    products.filter(product =>
      product.category.toLowerCase() ===
      category.toLowerCase()
    );

  if (filteredProducts.length === 0) {

    return await sendWhatsAppMessage(to, {

      type: "text",

      text: {

        body:
          "❌ No products are available in this category."

      }

    });

  }

  // Send Every Product

  for (const product of filteredProducts) {

    await sendWhatsAppMessage(to, {

      type: "interactive",

      interactive: {

        type: "button",

        header: {

          type: "image",

          image: {

            link: product.image

          }

        },

        body: {

          text:
`${product.name}

💰 Price : ₹${product.price}`

        },

        footer: {

          text: "Devika Collections"

        },

        action: {

          buttons: [

            {

              type: "reply",

              reply: {

                id: `BUY_${product.id}`,

                title: "🛒 Buy Now"

              }

            }

          ]

        }

      }

    });

  }

  // Last Message

  await sendWhatsAppMessage(to, {

    type: "text",

    text: {

      body:
`✅ End of ${category} Collection

Type "menu" anytime to browse other collections.`

    }

  });

}

// ============================================================
// Handle Buy Now
// ============================================================

async function handleBuyNow(to, productId) {

  const products = loadProducts();

  const product = products.find(
    p => String(p.id) === String(productId)
  );

  if (!product) {

    return await sendWhatsAppMessage(to, {
      type: "text",
      text: {
        body: "❌ Product not found."
      }
    });

  }

  // Customer Confirmation

  await sendWhatsAppMessage(to, {

    type: "text",

    text: {

      body:
`✅ Thank you for your interest!

Your request has been sent to Devika Collections.

Our team will contact you shortly.`

    }

  });

  // Send Product to Shop Owner

  await sendWhatsAppMessage("916260741302", {

    type: "image",

    image: {

      link: product.image,

      caption:

`🛍 NEW CUSTOMER

👤 Customer Number
+${to}

📦 Product
${product.name}

💰 Price
₹${product.price}

Please contact the customer.`

    }

  });

}

// ============================================================
// Free Text
// ============================================================

async function handleFreeText(to, userText) {

  await sendWhatsAppMessage(to, {

    type: "text",

    text: {

      body:
`🙏 Thank you for your message.

A member of Devika Collections will contact you soon.

Type "menu" anytime to browse our collections.`

    }

  });

}

// ============================================================
// Send WhatsApp Message
// ============================================================

async function sendWhatsAppMessage(to, payload) {

  await axios.post(

    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,

    {

      messaging_product: "whatsapp",

      recipient_type: "individual",

      to,

      ...payload

    },

    {

      headers: {

        Authorization: `Bearer ${WHATSAPP_TOKEN}`,

        "Content-Type": "application/json"

      }

    }

  );

}

// ============================================================
// Admin Dashboard
// ============================================================

const adminRoutes = require("./routes/admin");

app.use("/admin", adminRoutes);

// ============================================================
// Start Server
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`🚀 Bot running on port ${PORT}`);

});

