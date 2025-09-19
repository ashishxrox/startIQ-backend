// routes/analyse.js
const express = require("express");
const router = express.Router();
const { db, admin } = require("../firebase");
const { Timestamp } = require("firebase-admin/firestore");
const { generateDealNote } = require("../services/dealNoteService")
const { analyzeWithGemma } = require("../services/llmService");

// 🧩 Helper: Build prompt for Investor
function buildInvestorPrompt(investorData = {}) {
    return `
You are an investment analyst evaluating an investor.
Your task is to provide a structured, detailed, and balanced critique of the investor based on the data provided.
Focus on investment strategy, sector focus, track record, risk appetite, portfolio style, and alignment with founders.

📌 Investor Information:
- Name: ${investorData.profile?.investorName || "N/A"}
- Firm: ${investorData.profile?.firmName || "N/A"}
- Location: ${investorData.profile?.location || "N/A"}
- Type: ${investorData.profile?.investorType || "N/A"} (Angel / VC / PE / Family Office etc.)
- Website: ${investorData.profile?.website || "N/A"}
- LinkedIn: ${investorData.profile?.linkedin || "N/A"}

📌 Investment Preferences:
${investorData.profile?.investmentStage ? `- Stage Focus: ${investorData.profile.investmentStage}` : "- Stage Focus: N/A"}
${investorData.profile?.sectorFocus ? `- Sector Focus: ${investorData.profile.sectorFocus}` : "- Sector Focus: N/A"}
${investorData.profile?.ticketSize ? `- Ticket Size: ${investorData.profile.ticketSize}` : "- Ticket Size: N/A"}
${investorData.profile?.geography ? `- Geography: ${investorData.profile.geography}` : "- Geography: N/A"}

📌 Track Record:
${investorData.profile?.portfolio ? `- Portfolio: ${investorData.profile.portfolio}` : "- Portfolio: N/A"}
${investorData.profile?.notableExits ? `- Notable Exits: ${investorData.profile.notableExits}` : "- Notable Exits: N/A"}

---

🎯 Your task: Provide a comprehensive critique with these sections:
1. Strengths
2. Weaknesses / Risks
3. Investment Thesis & Focus
4. Alignment with Founders
5. Portfolio Synergies
6. Overall Recommendation

Be exhaustive, structured, and professional. Avoid generic advice—base your analysis on the provided data.
`;
}

// ----------------------
// 🧩 Analyse Investor
// ----------------------
router.post("/analyse-investor", async (req, res) => {
    try {
        const { investorID } = req.body;
        if (!investorID) {
            return res.status(400).json({ error: "investorID is required" });
        }

        const aiDocRef = db.collection("InvestorInsights").doc(investorID);
        const aiDoc = await aiDocRef.get();

        // CASE 1: Cached Insights (fresh < 7 days)
        if (aiDoc.exists) {
            const aiData = aiDoc.data();
            const createdAt = aiData.createdAt?.toDate?.() || aiData.createdAt;
            const now = new Date();
            const diffDays = createdAt
                ? (now - createdAt) / (1000 * 60 * 60 * 24)
                : Infinity;

            if (diffDays < 7) {
                return res.status(200).json({
                    success: true,
                    investorID,
                    insights: aiData.insights,
                    createdAt,
                    cached: true,
                });
            }
        }

        // CASE 2: Generate fresh insights
        const investorDoc = await db.collection("investors").doc(investorID).get();
        if (!investorDoc.exists) {
            return res.status(404).json({ error: "Investor not found" });
        }

        const investorData = investorDoc.data();
        const promptToSend = buildInvestorPrompt(investorData);

        // 🔮 Call LLM
        const insights = await analyzeWithGemma(promptToSend);

        // Save fresh insights
        await aiDocRef.set({
            insights,
            createdAt: Timestamp.now(),
        });

        res.status(200).json({
            success: true,
            investorID,
            insights,
            cached: false,
        });
    } catch (error) {
        console.error("❌ Error in /analyse-investor:", error);
        res.status(500).json({ error: "Failed to analyze investor" });
    }
});

router.post("/generate-deal-note", async (req, res) => {
  try {
    const { investorUID, startupID } = req.body;
    if (!investorUID || !startupID) {
      return res
        .status(400)
        .json({ error: "investorUID and startupID are required" });
    }

    const investorRef = db.collection("investors").doc(investorUID);
    const investorSnap = await investorRef.get();

    // ✅ 7-day caching check
    if (investorSnap.exists) {
      const existingNotes = investorSnap.data().dealNotes || {};
      const cachedNote = existingNotes[startupID];

      if (cachedNote?.createdAt) {
        const cachedAt = cachedNote.createdAt.toDate();
        const now = new Date();
        const diffDays = (now - cachedAt) / (1000 * 60 * 60 * 24);

        if (diffDays < 7) {
          // still add dynamic extras (not cached in DB)
          const startupDoc = await db.collection("AIInsights").doc(startupID).get();
          const startupData = startupDoc.data();

          return res.status(200).json({
            success: true,
            cached: true,
            dealNote: {
              ...cachedNote,
              risks: startupData?.redFlags || [],
              highlights: [
                ...(cachedNote.highlights || []),
                `AI Score: ${startupData?.score ?? "N/A"}`,
              ]
            }
          });
        }
      }
    }

    // 🔹 Fetch investor insights
    const investorDoc = await db
      .collection("InvestorInsights")
      .doc(investorUID)
      .get();
    if (!investorDoc.exists) {
      return res.status(404).json({ error: "Investor insights not found" });
    }
    const investorInsights = investorDoc.data().insights;

    // 🔹 Fetch startup insights
    const startupDoc = await db.collection("AIInsights").doc(startupID).get();
    if (!startupDoc.exists) {
      return res.status(404).json({ error: "Startup insights not found" });
    }
    const startupData = startupDoc.data();
    
    const startupInsights = startupData.insights;

    // 🔹 Generate deal note with LLM
    const dealNote = await generateDealNote(investorInsights, startupInsights);

    // 🔹 DB-only data
    const noteData = {
      note: dealNote.verdict || "No verdict generated",
      highlights: dealNote.highlights || [],
      fit: dealNote.fit || [],
      createdAt: admin.firestore.Timestamp.now(),
    };

    // Save into investors collection
    await investorRef.set(
      {
        role: "investor",
        dealNotes: {
          [startupID]: noteData,
        },
      },
      { merge: true }
    );

    // 🔹 Response = DB data + dynamic extras (NOT cached)
    res.status(200).json({
      success: true,
      cached: false,
      dealNote: {
        ...noteData,
        risks: startupData?.redFlags || [],
        highlights: [
          ...(noteData.highlights || []),
          `AI Score: ${startupData?.score ?? "N/A"}`,
        ]
      },
    });
  } catch (error) {
    console.error("❌ Error generating deal note:", error);
    res.status(500).json({ error: "Failed to generate deal note" });
  }
});

module.exports = router;
