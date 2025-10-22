const express = require("express");
const { db, admin } = require("../firebase.js");

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

    const formattedDealNotes = await Promise.all(
      Object.entries(dealNotesMap).map(async ([startupId, noteObj]) => {
        let startupName = "Unknown Startup";

        // Query founders collection to get startupName
        const foundersQuery = await db
          .collection("founders")
          .where("profile.startupID", "==", startupId) // match key with profile.startupID
          .limit(1)
          .get();

        if (!foundersQuery.empty) {
          const founderData = foundersQuery.docs[0].data();
          startupName = founderData.profile?.startupName || startupName;
        }

        // Format createdAt timestamp
        let dateGenerated = "Unknown Date";
        if (noteObj.createdAt?._seconds) {
          dateGenerated = new Date(noteObj.createdAt._seconds * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        }

        return {
          startupName,
          verdict: noteObj.note?.toLowerCase() || "consider",
          dateGenerated,
        };
      })
    );

    res.json(formattedDealNotes);
  } catch (error) {
    console.error("Error fetching deal notes:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



module.exports = router;
