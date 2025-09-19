// services/dealNoteService.js
const { analyzeWithGemma } = require("./llmService");
const { cleanJSONArrayResponse } = require("../utils/llmUtils");


/**
 * Generate a personalized deal note for an investor + startup pair.
 * Multi-step approach for guaranteed JSON structure.
 */
const generateDealNote = async (investorInsights, startupInsights) => {
  try {
    // Shared context
    const context = `
Investor Insights:
${investorInsights}

Startup Insights:
${startupInsights}
`;

    // 1️⃣ Generate Highlights
    const highlightsPrompt = `
${context}

List 2-3 bullet point highlights why this startup is interesting for this investor.
Output only a JSON array of strings.
`;
    const highlightsRes = await analyzeWithGemma(highlightsPrompt);
    const highlights = cleanJSONArrayResponse(highlightsRes);
    // let highlights = [];
    // try {
    //   highlights = JSON.parse(highlightsRes.trim());
    // } catch {
    //   highlights = [highlightsRes.trim()];
    // }

    // 2️⃣ Generate Fit
    const fitPrompt = `
${context}

List 2-3 points showing how the startup fits the investor’s focus.
Output only a JSON array of strings.
`;
    const fitRes = await analyzeWithGemma(fitPrompt);
    const fit = cleanJSONArrayResponse(fitRes);

    // let fit = [];
    // try {
    //   fit = JSON.parse(fitRes.trim());
    // } catch {
    //   fit = [fitRes.trim()];
    // }

    // 3️⃣ Generate Verdict (pass highlights + fit as extra context)
    const verdictPrompt = `
${context}

Highlights:
${JSON.stringify(highlights, null, 2)}

Fit:
${JSON.stringify(fit, null, 2)}

Based on the above, give a final recommendation for this investor regarding this startup.
Choose strictly one of: "Invest", "Consider", "Do Not Invest".

Output only a single word string, not a sentence just one word from the 3 options only, nothing else.
`;
    const verdictRes = await analyzeWithGemma(verdictPrompt);
    const verdict = verdictRes.trim().replace(/["']/g, "");

    // ✅ Final structured deal note
    return {
      highlights,
      fit,
      verdict,
    };
  } catch (error) {
    console.error("❌ Error generating deal note:", error);
    throw error;
  }
};

module.exports = { generateDealNote };
