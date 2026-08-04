const multer = require("multer");
const path = require("path");

// Use memory storage for direct Cloudinary upload without storing local files
const storage = multer.memoryStorage();

// File Filter for JPEG, JPG, PNG, WEBP from mobile gallery
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype.toLowerCase());

  if (extName && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error("Only JPEG, JPG, PNG, and WEBP images are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: fileFilter,
});

module.exports = upload;
