const cloudinary = require("cloudinary").v2;

// Verify environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn("⚠️ WARNING: Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing!");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary with automatic JPG conversion and compression for 100% WhatsApp & browser compatibility
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {String} folder - Cloudinary folder name
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
const uploadToCloudinary = (buffer, folder = "mummy_shop_products") => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return reject(new Error("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Render Environment Variables."));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "image",
        format: "jpg", // Converts PNG, WEBP, HEIC from gallery to standard JPG for 100% WhatsApp API compatibility
        transformation: [
          { width: 1200, height: 1200, crop: "limit", quality: "auto" }
        ]
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary Upload Stream Error:", error);
          return reject(error);
        }
        console.log("✅ Cloudinary Upload Successful:", result.secure_url);
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary using its public_id
 * @param {String} publicId - Cloudinary image public_id
 * @returns {Promise<any>}
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑 Cloudinary Image Deleted (${publicId}):`, result);
    return result;
  } catch (error) {
    console.error(`❌ Cloudinary Delete Error (${publicId}):`, error);
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
};
