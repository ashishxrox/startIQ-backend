const { analyzeWithGemma } = require("./llmService");

/**
 * Scores an investor based on AI-generated insights.
 * The score reflects the investor's credibility, experience, network strength, and investment potential.
 *
 * @param {string} insights - AI-generated investor insights (e.g., from deck analysis or past portfolio data)
 * @returns {Promise<number|null>} A numeric score between 0–100, or null if scoring fails
 */
const scoreInvestor = async (insights) => {
  const prompt = `
You are an AI analyst evaluating a venture investor.
Your goal is to assign a **Credibility & Investment Potential Score (0–100)** based on the provided insights.

---

### SCORING FRAMEWORK
Evaluate using the following weighted dimensions:
1. **Track Record (25%)** – Quality, volume, and outcomes of past investments.
2. **Domain Expertise (20%)** – Depth of knowledge and specialization within relevant industries.
3. **Network & Influence (20%)** – Strength of connections, deal access, and founder relationships.
4. **Engagement Style (15%)** – Mentorship value, involvement post-investment, reputation among founders.
5. **Capital Reliability (20%)** – Liquidity, commitment, and funding consistency.

---

### SCORING SCALE
- **85–100:** Elite investor with proven exits, strong network, and excellent reputation.
- **70–84:** Experienced investor with solid track record and decent network.
- **50–69:** Average investor, limited proof of results, moderate credibility.
- **30–49:** Inconsistent, low network, or minimal domain knowledge.
- **0–29:** Unreliable or inexperienced, minimal ecosystem contribution.

---

### MODIFIERS
- Deduct 5–15 points if the investor shows weak portfolio performance or poor founder relations.
- Add 5–10 points if known for founder support, successful exits, or domain thought leadership.
- Avoid returning safe mid-range values unless strongly justified.

---

### INPUT
Investor Insights:
${insights}

---

### OUTPUT FORMAT
Return ONLY a numeric score between 0 and 100. No explanation or text.
`;

  try {
    const scoreText = await analyzeWithGemma(prompt);
    if (!scoreText) throw new Error("Empty response from model");

    // Extract first valid number between 0–100
    const match = scoreText.match(/\b(100|[1-9]?\d)\b/);
    if (!match) throw new Error(`No valid score found in response: "${scoreText}"`);

    const score = parseInt(match[0], 10);

    // Final safeguard
    if (score < 0 || score > 100 || isNaN(score)) {
      throw new Error(`Score out of bounds or invalid: ${scoreText}`);
    }

    return score;
  } catch (error) {
    console.error("⚠️ Investor scoring failed:", error.message);
    return null;
  }
};

module.exports = { scoreInvestor };
