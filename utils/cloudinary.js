const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Check if Cloudinary environment variables are configured
 */
const isCloudinaryConfigured = () => {
  return (
    !!process.env.CLOUDINARY_CLOUD_NAME &&
    !!process.env.CLOUDINARY_API_KEY &&
    !!process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== "your_cloud_name"
  );
};

/**
 * Upload a file buffer to Cloudinary using Node Stream
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {String} folder - Cloudinary folder name
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
const uploadToCloudinary = (buffer, folder = "mummy_shop_products") => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(
        new Error(
          "Cloudinary credentials are missing! Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your Render Environment Variables."
        )
      );
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary Upload Error:", error);
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }
        console.log("✅ Cloudinary Upload Successful:", result.secure_url);
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    // Convert Buffer to Readable Stream for 100% reliable piping across Node versions
    const bufferStream = Readable.from(buffer);
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Delete an image from Cloudinary using its public_id
 * @param {String} publicId - Cloudinary image public_id
 * @returns {Promise<any>}
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) return;
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
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
};
