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
      profile: profileData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ User saved to ${collectionName}:`, uid);

    res.status(200).json({ 
      message: `User registered in ${collectionName} successfully!`, 
      startupID: profileData.startupID || null, // ✅ return startupID if exists
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
        const startupDoc = await db.collection("documents").doc(startupID).get();
        let youtubeLink = null;
        if (startupDoc.exists) {
          youtubeLink = startupDoc.data().ytLink || null;
        }
        return res.status(200).json({
          role: "founder",
          profile: founderDoc.data().profile || {},
          startupID: founderDoc.data().startupID || null,
          ytLink: youtubeLink
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

         // 🔹 Fetch youtubeLink from startups collection
        let youtubeLink = null;
        const startupDoc = await db.collection("documents").doc(startupID).get();
        if (startupDoc.exists) {
          youtubeLink = startupDoc.data().ytLink || null;
        }

        return res.status(200).json({
          role: "founder",
          profile: doc.data().profile || {},
          startupID: doc.data().startupID,
          ytLink: youtubeLink
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


// ---------- GET ALL STARTUPS WITH PAGINATION ----------
router.get("/all-startups", async (req, res) => {
  try {
    // Query params: page size and cursor (last startup doc id)
    const { limit = 10, cursor = null } = req.query;

    // Step 1: fetch startupIDs from "documents" collection
    const docsSnapshot = await db.collection("documents").get();
    const validStartupIDs = docsSnapshot.docs.map((doc) => doc.id); 
    // assuming each document.id == startupID

    if (validStartupIDs.length === 0) {
      return res.status(200).json({ startups: [], nextCursor: null, totalCount: 0 });
    }

    // Step 2: query founders with pagination
    let queryRef = db.collection("founders").orderBy("createdAt", "desc").limit(Number(limit));

    if (cursor) {
      // cursor is the last doc id from previous page
      const lastDoc = await db.collection("founders").doc(cursor).get();
      if (lastDoc.exists) {
        queryRef = queryRef.startAfter(lastDoc);
      }
    }

    const snapshot = await queryRef.get();

    if (snapshot.empty) {
      return res.status(200).json({ startups: [], nextCursor: null, totalCount: validStartupIDs.length });
    }

    // Step 3: collect startups whose startupID exists in documents
    const startups = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.profile?.startupID && validStartupIDs.includes(data.profile.startupID)) {
        startups.push({
          uid: doc.id,
          startupName: data.profile?.startupName || "",
          founderName: data.profile?.founderName || "",
          startupID: data.profile?.startupID || "",
        });
      }
    });

    // Step 4: next cursor (for frontend to fetch next page)
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastVisible ? lastVisible.id : null;

    // Step 5: return response including totalCount
    res.status(200).json({ startups, nextCursor, totalCount: validStartupIDs.length });
  } catch (error) {
    console.error("❌ Error fetching startups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
