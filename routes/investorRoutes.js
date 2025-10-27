const express = require("express");
const { db, admin } = require("../firebase.js");
const { timeSince } = require("../utils/timeUtils.js")

const router = express.Router();

// ---------- ROUTE: Toggle favorite startup for an investor ----------
router.post("/toggle-favorite", async (req, res) => {
  try {
    const { investorID, startupID } = req.body;

    if (!investorID || !startupID) {
      return res.status(400).json({ error: "investorID and startupID are required" });
    }

    // Fetch investor document
    const investorRef = db.collection("investors").doc(investorID);
    const investorDoc = await investorRef.get();

    if (!investorDoc.exists) {
      return res.status(404).json({ error: "Investor not found" });
    }

    const favorites = investorDoc.data().favorites || [];

    let message;
    if (favorites.includes(startupID)) {
      // Remove from favorites
      await investorRef.update({
        favorites: admin.firestore.FieldValue.arrayRemove(startupID)
      });
      message = `Startup ${startupID} removed from investor ${investorID}'s favorites`;
    } else {
      // Add to favorites
      await investorRef.update({
        favorites: admin.firestore.FieldValue.arrayUnion(startupID)
      });
      message = `Startup ${startupID} added to investor ${investorID}'s favorites`;
    }

    res.status(200).json({ message, currentState: !favorites.includes(startupID) });

  } catch (error) {
    console.error("❌ Error toggling favorite startup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- ROUTE: Get favourite startups for an investor ----------
router.get("/favourites/:investorID", async (req, res) => {
  try {
    const { investorID } = req.params;

    if (!investorID) {
      return res.status(400).json({ error: "investorID is required" });
    }

    // Step 1: Fetch investor document
    const investorRef = db.collection("investors").doc(investorID);
    const investorDoc = await investorRef.get();

    if (!investorDoc.exists) {
      return res.status(404).json({ error: "Investor not found" });
    }

    const favouriteIDs = investorDoc.data().favorites || [];

    // Step 2: Fetch startup details for each favourite
    const startupPromises = favouriteIDs.map(async (startupID) => {
      const querySnapshot = await db
        .collection("founders")
        .where("profile.startupID", "==", startupID)
        .limit(1)
        .get();

      if (querySnapshot.empty) return null;

      const data = querySnapshot.docs[0].data();
      return {
        name: data.profile?.startupName || "",
        sector: data.profile?.industry || "",
        stage: data.profile?.stage || "",
        logoUrl: data.profile?.logoUrl || "",
        startupID: data.profile?.startupID || ""
      };
    });

    const favourites = (await Promise.all(startupPromises)).filter(Boolean);

    res.status(200).json({ favourites });
  } catch (error) {
    console.error("❌ Error fetching favourite startups:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- ROUTE: Get all dealNotes for an investor ----------
router.get("/deal-notes/:investorID", async (req, res) => {
  try {
    const { investorID } = req.params;

    // 1️⃣ Fetch investor document
    const investorRef = db.collection("investors").doc(investorID);
    const investorDoc = await investorRef.get();

    if (!investorDoc.exists) {
      return res.status(404).json({ message: "Investor not found" });
    }

    const investorData = investorDoc.data();
    const dealNotesMap = investorData.dealNotes || {};

    // 2️⃣ Define constants
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const validDealNotes = {};
    const formattedDealNotes = [];
    let oldestNoteTime = null;

    // 3️⃣ Loop through deal notes
    for (const [startupId, noteObj] of Object.entries(dealNotesMap)) {
      const createdAtMs = noteObj.createdAt?._seconds
        ? noteObj.createdAt._seconds * 1000
        : null;

      // Skip expired ones
      if (!createdAtMs || createdAtMs < sevenDaysAgo) continue;

      // Keep track of oldest active note
      if (!oldestNoteTime || createdAtMs < oldestNoteTime) {
        oldestNoteTime = createdAtMs;
      }

      // Keep valid notes
      validDealNotes[startupId] = noteObj;

      // Fetch startup name
      let startupName = "Unknown Startup";
      const foundersQuery = await db
        .collection("founders")
        .where("profile.startupID", "==", startupId)
        .limit(1)
        .get();

      if (!foundersQuery.empty) {
        const founderData = foundersQuery.docs[0].data();
        startupName = founderData.profile?.startupName || startupName;
      }

      // Format date
      const dateGenerated = new Date(createdAtMs).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      formattedDealNotes.push({
        startupName,
        verdict: noteObj.note?.toLowerCase() || "consider",
        dateGenerated,
      });
    }

    // 4️⃣ Auto-remove expired ones
    if (Object.keys(validDealNotes).length !== Object.keys(dealNotesMap).length) {
      await investorRef.update({ dealNotes: validDealNotes });
    }

    // 5️⃣ Calculate remaining notes and reset timer
    const totalActive = Object.keys(validDealNotes).length;
    const remainingNotes = Math.max(5 - totalActive, 0);

    let daysUntilReset = 0;
    if (oldestNoteTime) {
      const resetDate = oldestNoteTime + 7 * 24 * 60 * 60 * 1000;
      const msLeft = resetDate - now;
      daysUntilReset = Math.max(Math.ceil(msLeft / (24 * 60 * 60 * 1000)), 0);
    }

    const canCreateMore = remainingNotes > 0;

    // 6️⃣ Respond with all info
    res.json({
      canCreateMore,
      totalActive,
      remainingNotes,
      daysUntilReset,
      dealNotes: formattedDealNotes,
    });
  } catch (error) {
    console.error("❌ Error fetching deal notes:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// ---------- ROUTE: Get investor profile data ----------
router.get("/:investorID", async (req, res) => {
  try {
    const { investorID } = req.params;

    const investorRef = db.collection("investors").doc(investorID);
    const doc = await investorRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Investor not found" });
    }

    const profile = doc.data().profile || {};

    // structure data for frontend clarity
    const investorData = {
      investorName: profile.investorName || "",
      contactNumber: profile.contactNumber || "",
      email: profile.email || "",
      individualAngelInvestor: profile.individualAngelInvestor || "",
      investmentIdeology: profile.investmentIdeology || "",
      preferredSectors: profile.preferredSectors || "",
      ticketSizeRange: profile.ticketSizeRange || "",
      location: profile.location || ""
    };

    res.json(investorData);
  } catch (error) {
    console.error("❌ Error fetching investor data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------- ROUTE: Get Updates of favourites ----------
router.get("/notifications/:investorID", async (req, res) => {
  try {
    const { investorID } = req.params;

    // 1️⃣ Get investor's favourites
    const investorDoc = await db.collection("investors").doc(investorID).get();
    if (!investorDoc.exists) return res.status(404).json({ error: "Investor not found" });

    const favourites = investorDoc.data().favorites || [];
    if (favourites.length === 0) return res.json([]); // no favourites

    // 2️⃣ Map startupID => startupName
    const startupDocs = await db.collection("founders").get();
    const startupMap = {};
    startupDocs.forEach(doc => {
      const profile = doc.data().profile || {};
      if (profile.startupID && profile.startupName) {
        startupMap[profile.startupID] = profile.startupName;
      }
    });

    // 3️⃣ Fetch updates for favourite startups
    let allUpdates = [];
    for (const startupID of favourites) {
      const doc = await db.collection("startup_updates").doc(startupID).get();
      if (doc.exists) {
        const startupUpdates = doc.data().updates || [];
        startupUpdates.forEach(update => {
          allUpdates.push({
            startupID,
            message: update.updateContent || "",
            createdAt: update.dateCreated || null
          });
        });
      }
    }

    // 4️⃣ Sort updates by createdAt descending
    allUpdates.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

    // 5️⃣ Keep only top 10 most recent updates
    const topUpdates = allUpdates.slice(0, 10);

    // 5️⃣ Normalize to notifications format
    const notifications = topUpdates.map((update, index) => ({
      id: index + 1,
      startupName: startupMap[update.startupID] || "Unknown Startup",
      message: update.message,
      time: update.createdAt ? timeSince(update.createdAt.toDate()) : ""
    }));

    res.json(notifications);

  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
