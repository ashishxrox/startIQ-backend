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
        const startupDoc = await db.collection("documents").doc(founderDoc.data().profile.startupID).get();
        let youtubeLink = null;
        if (startupDoc.exists) {
          youtubeLink = startupDoc.data().ytLink || null;
        }
        return res.status(200).json({
          role: "founder",
          profile: founderDoc.data().profile || {},
          startupID: founderDoc.data().profile.startupID || null,
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
    // Query params: page size and page number
    const { pageSize, pageNumber } = req.query;

    // Step 1: fetch startupIDs from "documents" collection
    const docsSnapshot = await db.collection("documents").get();
    const validStartupIDs = docsSnapshot.docs.map((doc) => doc.id); 
    // assuming each document.id == startupID

    if (validStartupIDs.length === 0) {
      return res.status(200).json({ startups: [], totalCount: 0 });
    }

    // Step 2: fetch all founders
    const foundersSnapshot = await db
      .collection("founders")
      .orderBy("createdAt", "desc")
      .get();

    if (foundersSnapshot.empty) {
      return res.status(200).json({ startups: [], totalCount: validStartupIDs.length });
    }

    // Step 3: collect startups whose startupID exists in documents
    let allStartups = [];
    foundersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.profile?.startupID && validStartupIDs.includes(data.profile.startupID)) {
        allStartups.push({
          uid: doc.id,
          startupName: data.profile?.startupName || "",
          founderName: data.profile?.founderName || "",
          startupID: data.profile?.startupID || "",
        });
      }
    });

    const totalCount = allStartups.length;

    // Step 4: apply pagination if pageSize & pageNumber are provided
    let startups = allStartups;
    if (pageSize && pageNumber) {
      const size = Number(pageSize);
      const page = Number(pageNumber);

      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;

      startups = allStartups.slice(startIndex, endIndex);
    }

    // Step 5: return response including totalCount
    res.status(200).json({ startups, totalCount });
  } catch (error) {
    console.error("❌ Error fetching startups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// -------- ROUTE: Add startup update --------
router.post("/create-update", async (req, res) => {
  try {
    const { uid, updateContent } = req.body;

    if (!uid || !updateContent) {
      return res.status(400).json({ error: "uid and updateContent are required" });
    }

    // Step 1: get founder profile
    const founderDoc = await db.collection("founders").doc(uid).get();
    if (!founderDoc.exists) {
      return res.status(404).json({ error: "Founder not found" });
    }

    const startupID = founderDoc.data().profile?.startupID;
    if (!startupID) {
      return res.status(400).json({ error: "No startupID found for this user" });
    }

    // Step 2: prepare update object with proper timestamp
    const newUpdate = {
      updateContent,
      dateCreated: new Date() // ✅ store JS Date instead of serverTimestamp inside array
    };

    // Step 3: add to startup_updates collection
    await db.collection("startup_updates").doc(startupID).set({
      updates: admin.firestore.FieldValue.arrayUnion(newUpdate)
    }, { merge: true });

    res.status(200).json({
      message: "Update added successfully",
      update: newUpdate
    });

  } catch (error) {
    console.error("❌ Error creating update:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- GET ALL UPDATES FOR A STARTUP ----------
router.get("/startup-updates/:startupID", async (req, res) => {
  try {
    const { startupID } = req.params;
    console.log(startupID)

    if (!startupID) {
      return res.status(400).json({ error: "startupID is required" });
    }

    const docRef = db.collection("startup_updates").doc(startupID);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(200).json({ updates: [] });
    }

    const data = docSnap.data();
    const updates = data.updates || [];

    // Optional: sort by dateCreated descending
    updates.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

    res.status(200).json({ updates });
  } catch (error) {
    console.error("❌ Error fetching startup updates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;
