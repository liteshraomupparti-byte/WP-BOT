// ============================================================
// Mummy's Shop WhatsApp Bot
// Node.js + Express + WhatsApp Cloud API + Claude AI fallback
// ============================================================

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "mummy-shop-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// ---------- CONFIG (fill these in your .env file) ----------
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // koi bhi random string, tu khud banayega
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Meta se milega
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // Meta se milega

//---------- Load Product---------------------
function loadProducts() {
  const file = path.join(__dirname, "database", "products.json");

  if (!fs.existsSync(file)) {
    return [];
  }

  const raw = fs.readFileSync(file, "utf8");

  if (!raw.trim()) {
    return [];
  }

  return JSON.parse(raw);
}

// ============================================================
// 1) WEBHOOK VERIFICATION (Meta ye ek baar call karta hai setup ke waqt)
// ============================================================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ============================================================
// 2) INCOMING MESSAGES (customer jab bhi message/click karega, yahan aayega)
// ============================================================
app.post("/webhook", async (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));

  res.sendStatus(200); // Meta ko turant reply karo, warna woh retry karega

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return; // status update waghera, ignore karo

    const from = message.from; // customer ka number

    if (message.type === "text") {
      const text = message.text.body.trim().toLowerCase();
      if (["hi", "hello", "hey", "namaste", "menu"].includes(text)) {
        await sendMainMenu(from);
      } else {
        await handleFreeText(from, message.text.body);
      }
    } else if (message.type === "interactive") {
      const interactive = message.interactive;
      const selectedId =
        interactive?.list_reply?.id || interactive?.button_reply?.id;

        if (selectedId.startsWith("BUY_")) {
    await handleBuyNow(from, selectedId);
    return;
}
      await handleBuyNow(from, selectedId.replace("BUY_", ""));
    } else {
      await sendMainMenu(from);
    }
  } catch (err) {
    console.error("Error handling message:", err.response?.data || err.message);
  }
});

// ============================================================
// 3) MAIN MENU (categories dikhata hai)
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
    description: "Exclusive Products",
  },
];


  await sendWhatsAppMessage(to, {
    type: "interactive",
    interactive: {
      type: "list",
      header: {
type:"text",
text:"Devika Collections"
},
      body: { text: "Welcome to Devika Collections! ✨\n\nPlease choose a category below." },
footer: { text: "Premium Fashion Collection" },
action: {
  button: "View Collections",
        sections: [{ title: "Categories", rows }],
      },
    },
  });
}

// ============================================================
// 4) CATEGORY SELECT HONE PAR — items dikhao (image + price + caption)
// ============================================================
async function handleMenuSelection(to, selectedId) {

  console.log("Selected:", selectedId);

  if (!selectedId) return sendMainMenu(to);

  const category = selectedId.replace("CAT_", "");

  const products = loadProducts();

  const filteredProducts = products.filter(
    p => p.category.toLowerCase() === category.toLowerCase()
  );

  if (filteredProducts.length === 0) {

    return sendWhatsAppMessage(to,{
      type:"text",
      text:{
        body:"No products are available in this category at the moment."
      }
    });

  }

  for(const product of filteredProducts){

    await sendWhatsAppMessage(to,{
  type:"interactive",
  interactive:{
    type:"button",
    header:{
      type:"image",
      image:{
        link: product.image
      }
    },
    body:{
      text:`${product.name}\n\n₹${product.price}`
    },
    action:{
      buttons:[
        {
          type:"reply",
          reply:{
            id:`BUY_${product.id}`,
            title:"🛒 Buy Now"
          }
        }
      ]
    }
  }
});


async function handleBuyNow(to, productId) {

  const products = loadProducts();

  const product = products.find(p => String(p.id) === String(productId));

  if (!product) return;

  // Customer ko confirmation
  await sendWhatsAppMessage(to, {
    type: "text",
    text: {
      body: "✅ Thank you! Your request has been sent to Devika Collections. We will contact you shortly."
    }
  });

  // Mummy ko photo + details
  await sendWhatsAppMessage("916260741302", {
    type: "image",
    image: {
      link: product.image,
      caption:
`🛍 New Customer Interested

📦 Product: ${product.name}
💰 Price: ₹${product.price}

📱 Customer: +${to}`
    }
  });

}


    // Follow-up text with a way to go back
    await sendWhatsAppMessage(to, {
      type: "text",
      text: {
        body: `You have reached the ${selectedId.replace("CAT_", "")} collection.\n\nReply to this message if you need more details.\n\nType "menu" to browse other collections.`
      },
    });
  }
}

// ============================================================
// 5) FREE TEXT — jab customer button/menu ke bajaye khud type kare
// (AI nahi hai abhi, isliye ek fixed helpful reply bhejte hain)
// ============================================================
async function handleFreeText(to, userText) {
  await sendWhatsAppMessage(to, {
    type: "text",
    text: {
      body: "Thank you for your message.\n\nOur team will get back to you shortly.\n\nType 'menu' to browse our collections.",
    },
  });
}

// ============================================================
// 6) WHATSAPP KO MESSAGE BHEJNE KA HELPER
// ============================================================
async function sendWhatsAppMessage(to, payload) {
  await axios.post(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
    { messaging_product: "whatsapp", to, ...payload },
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" } }
  );
}
const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot server running on port ${PORT}`));