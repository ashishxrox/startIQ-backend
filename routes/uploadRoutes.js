const express = require("express");
const { uploadMiddleware } = require("../middleware/uploadMiddleware");
const { handleFileUpload } = require("../controllers/uploadController");

const router = express.Router();

// Single Excel file upload -> field name must match 'financials'
router.post(
  "/upload",
  uploadMiddleware.single("financials"),
  handleFileUpload
);

module.exports = router;
