// routes/analyse.js
const express = require("express");
const router = express.Router();
const { db, admin } = require("../firebase"); // ✅ adjust path to your firebase config
const { Timestamp } = require("firebase-admin/firestore");
const { analyzeWithGemma } = require("../services/llmService");
const { extractFlags } = require("../services/flagService");


// Helper to build a prompt from DB data (if you prefer dynamic prompts)
function buildPromptFromData(founderData = {}, documentsData = {}) {
    return `
You are a venture analyst evaluating a startup.
Your task is to provide a structured, detailed, and balanced critique of the startup based on the data provided.
Focus on market potential, business fundamentals, financial health, risks, and overall investability.

📌 Startup Information:
- Name: ${founderData.profile?.startupName || "N/A"}
- Founder: ${founderData.profile?.founderName || "N/A"}
- Year Founded: ${founderData.profile?.yearFounded || "N/A"}
- Location: ${founderData.profile?.location || "N/A"}
- Industry: ${founderData.profile?.industry || "N/A"}
- Stage: ${founderData.profile?.stage || "N/A"}
- Website: ${founderData.profile?.website || "N/A"}
- LinkedIn: ${founderData.profile?.linkedin || "N/A"}
- Founder LinkedIn: ${founderData.profile?.founderLinkedin || "N/A"}

📌 Business Overview:
${founderData.profile?.pitch ? `- Pitch: ${founderData.profile.pitch}` : "- Pitch: N/A"}
${founderData.profile?.problem ? `- Problem: ${founderData.profile.problem}` : "- Problem: N/A"}
${founderData.profile?.solution ? `- Solution: ${founderData.profile.solution}` : "- Solution: N/A"}

📌 Traction & Financials:
${founderData.profile?.customerCount ? `- Customers: ${founderData.profile.customerCount}` : "- Customers: N/A"}
${founderData.profile?.growthRate ? `- Growth Rate: ${founderData.profile.growthRate}` : "- Growth Rate: N/A"}
${founderData.profile?.milestones ? `- Milestones: ${founderData.profile.milestones}` : "- Milestones: N/A"}
${founderData.profile?.revenue ? `- Revenue: ${founderData.profile.revenue}` : "- Revenue: N/A"}

📂 Related Documents / Raw Data:
${JSON.stringify(documentsData, null, 2)}

---

🎯 Your task: Provide a comprehensive critique with these sections:
1. Strengths
2. Weaknesses / Risks
3. Opportunities
4. Threats
5. Financial Analysis
6. Funding Feasibility
7. Overall Recommendation

Be exhaustive, structured, and professional. Avoid generic advice—base your analysis on the provided data.
`;
}

router.post("/analyse-with-ai", async (req, res) => {
  try {
    const { startupID } = req.body;
    if (!startupID) {
      return res.status(400).json({ error: "startupID is required" });
    }

    const aiDocRef = db.collection("AIInsights").doc(startupID);
    const aiDoc = await aiDocRef.get();

    // -------------------------------
    // 🔍 CASE 1: Insight already exists
    // -------------------------------
    if (aiDoc.exists) {
      const aiData = aiDoc.data();
      const createdAt = aiData.createdAt?.toDate?.() || aiData.createdAt;
      const now = new Date();
      const diffDays = createdAt
        ? (now - createdAt) / (1000 * 60 * 60 * 24)
        : Infinity;

      // ✅ If insights are still fresh (< 7 days)
      if (diffDays < 7) {
        let redFlags = aiData.redFlags || [];

        // ⚠️ Generate redFlags only if missing
        if (!redFlags.length) {
          redFlags = await extractFlags(aiData.insights);

          // update only redFlags, keep original createdAt
          await aiDocRef.update({ redFlags });
        }

        return res.status(200).json({
          success: true,
          startupID,
          insights: aiData.insights,
          redFlags,
          cached: true,
        });
      }
    }

    // -------------------------------
    // 🔍 CASE 2: Generate fresh insights & redFlags
    // -------------------------------

    // Step 1: Get founder info
    const founderSnapshot = await db
      .collection("founders")
      .where("profile.startupID", "==", startupID)
      .limit(1)
      .get();

    if (founderSnapshot.empty) {
      return res.status(404).json({ error: "Startup not found" });
    }

    const founderData = founderSnapshot.docs[0].data();

    // Step 2: Get related documents
    const docsSnapshot = await db.collection("documents").doc(startupID).get();
    const documentsData = docsSnapshot.exists ? docsSnapshot.data() : {};

    // Step 3: Build AI prompt
    const promptToSend = buildPromptFromData(founderData, documentsData);

    // Step 4: Generate new insights
    const insights = await analyzeWithGemma(promptToSend);

    // Step 5: Generate redFlags
    const redFlags = await extractFlags(insights);

    // Step 6: Save fresh insights & redFlags
    await aiDocRef.set({
      insights,
      redFlags,
      createdAt: Timestamp.now(),
    });

    // Step 7: Respond
    res.status(200).json({
      success: true,
      startupID,
      insights,
      redFlags,
      cached: false,
    });
  } catch (error) {
    console.error("❌ Error in /analyse-with-ai:", error);
    res.status(500).json({ error: "Failed to analyze startup" });
  }
});

module.exports = router;
