// services/scoringService.js
const { analyzeWithGemma } = require("./llmService");

const scoreStartup = async (insights, redFlags, greenFlags) => {
  const prompt = `
You are acting as a venture capitalist. 
Based on the following analysis, red flags, and green flags, give the startup a final investment score out of 100.

Guidelines:
- Consider the insights holistically (market, product, traction, team, competition, financials).
- Deduct points for red flags (risks).
- Add points for green flags (strengths).
- The score must reflect overall investability, not just the count of flags.
- Return ONLY a number between 0 and 100, no explanation, no extra text.

Startup Analysis:
${insights}

Red Flags:
${JSON.stringify(redFlags)}

Green Flags:
${JSON.stringify(greenFlags)}
  `;

  try {
    const scoreText = await analyzeWithGemma(prompt);
    const score = parseInt(scoreText.trim(), 10);

    if (isNaN(score) || score < 0 || score > 100) {
      throw new Error(`Invalid score returned: ${scoreText}`);
    }

    return score;
  } catch (error) {
    console.error("⚠️ Scoring failed:", error.message);
    return null;
  }
};

module.exports = { scoreStartup };
