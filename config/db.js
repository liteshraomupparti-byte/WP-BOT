const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI || mongoURI.includes("<username>") || mongoURI.includes("your_mongodb_uri")) {
    console.error("⚠️ MONGODB_URI is missing or contains placeholder values! Please set a valid MONGODB_URI in Render Environment Variables.");
    return false;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    return false;
  }
};

module.exports = connectDB;
