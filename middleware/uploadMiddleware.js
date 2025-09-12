const multer = require("multer");

// In-memory storage (serverless friendly)
const storage = multer.memoryStorage();

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
});

module.exports = { uploadMiddleware };
