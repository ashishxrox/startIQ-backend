const express = require("express");
const { uploadMiddleware } = require("../middleware/uploadMiddleware");
const { handleFileUpload } = require("../controllers/uploadController");
const { db, admin } = require("../firebase"); // ✅ import Firestore

const router = express.Router();

// Single Excel file upload + YouTube link
router.post(
  "/upload",
  uploadMiddleware.single("financials"),
  (req, res, next) => {
    const { ytLink, startupID } = req.body;

    if (!ytLink) {
      return res.status(400).json({ error: "YouTube link is required" });
    }
    if (!startupID) {
      return res.status(400).json({ error: "Startup is required" });
    }

    // pass link along to controller
    req.ytLink = ytLink;
    req.startupID = startupID
    next();
  },
  handleFileUpload
);

// -------- Check Documents Route --------
router.post("/check-documents", async (req, res) => {
  try {
    const { startupID } = req.body;

    if (!startupID) {
      return res.status(400).json({ error: "Startup ID is required" });
    }

    const docRef = db.collection("documents").doc(startupID);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(200).json({ exists: false });
    }

    return res.status(200).json({ 
      exists: true, 
      data: docSnap.data() 
    });
  } catch (error) {
    console.error("❌ Error checking documents:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
