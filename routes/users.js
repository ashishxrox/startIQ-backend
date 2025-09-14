const express = require("express");
const { db, admin } = require("../firebase.js");
const { v4: uuidv4 } = require("uuid"); // ✅ import uuid

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

    // Generate startupID only for founders/startups
    let profileData = data || {};
    if (role.toLowerCase() === "founder" || role.toLowerCase() === "startup") {
      profileData = {
        ...profileData,
        startupID: uuidv4(), // ✅ now inside profile
      };
    }

    // Save into the correct collection
    await db.collection(collectionName).doc(uid).set({
      role,
      profile: data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ User saved to ${collectionName}:`, uid);
    const startupID = profile.startupID

    res.status(200).json({ 
      message: `User registered in ${collectionName} successfully!`, 
      startupID 
    });
  } catch (error) {
    console.error("❌ Error registering user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;



// -------- ROUTE: Check User Role --------
router.post("/check-role", async (req, res) => {
  try {
    const { uid, startupID } = req.body;

    if (!uid && !startupID) {
      return res.status(400).json({ error: "Either uid or startupID is required" });
    }

    let userDoc = null;

    // 🔹 Case 1: Lookup by uid (direct doc fetch)
    if (uid) {
      const founderDoc = await db.collection("founders").doc(uid).get();
      if (founderDoc.exists) {
        return res.status(200).json({
          role: "founder",
          profile: founderDoc.data().profile || {},
          startupID: founderDoc.data().startupID || null,
        });
      }

      const investorDoc = await db.collection("investors").doc(uid).get();
      if (investorDoc.exists) {
        return res.status(200).json({
          role: "investor",
          profile: investorDoc.data().profile || {},
        });
      }
    }

    // 🔹 Case 2: Lookup by startupID (query)
    if (startupID) {
      const founderQuery = await db
        .collection("founders")
        .where("profile.startupID", "==", startupID)
        .limit(1)
        .get();

      if (!founderQuery.empty) {
        const doc = founderQuery.docs[0];
        return res.status(200).json({
          role: "founder",
          profile: doc.data().profile || {},
          startupID: doc.data().startupID,
        });
      }
    }

    // ❌ User not found
    return res.status(404).json({ error: "User not found in founders or investors" });
  } catch (error) {
    console.error("❌ Error checking user role:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ---------- GET ALL STARTUPS ----------
router.get("/all-startups", async (req, res) => {
  try {
    const snapshot = await db.collection("founders").get();

    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const startups = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(data.profile)
      startups.push({
        uid: doc.id,
        startupName: data.profile?.startupName || "",
        founderName: data.profile?.founderName || "",
        startupID: data.profile?.startupID || ""
      });
    });

    res.status(200).json(startups);
  } catch (error) {
    console.error("❌ Error fetching startups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
