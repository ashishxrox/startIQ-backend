const express = require("express");
const { db, admin } = require("../firebase.js");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { uid, role, data } = req.body;

    console.log("📥 Incoming payload:", req.body);

    if (!uid || !role) {
      return res.status(400).json({ error: "uid and role are required" });
    }

    // Decide collection based on role
    let collectionName;
    if (role.toLowerCase() === "founder" || role.toLowerCase() === "startup") {
      collectionName = "founders";
    } else if (role.toLowerCase() === "investor") {
      collectionName = "investors";
    } else {
      return res.status(400).json({ error: "Invalid role provided" });
    }

    // Save into the correct collection
    await db.collection(collectionName).doc(uid).set({
      role,
      profile: data || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ User saved to ${collectionName}:`, uid);

    res.status(200).json({ message: `User registered in ${collectionName} successfully!` });
  } catch (error) {
    console.error("❌ Error registering user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
