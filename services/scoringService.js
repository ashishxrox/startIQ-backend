// services/scoringService.js
const { analyzeWithGemma } = require("./llmService");

const scoreStartup = async (insights, redFlags, greenFlags) => {
  const prompt = `
You are a venture capitalist evaluating an early-stage startup. 
Your task is to assign a numeric **Investment Score (0–100)** based on the provided analysis.

---

### SCORING FRAMEWORK
Evaluate on the following weighted criteria:
1. **Market Opportunity (20%)** – Size, growth, timing, and scalability of the market.
2. **Product Strength (20%)** – Uniqueness, defensibility, and product-market fit.
3. **Team & Execution (20%)** – Founders’ experience, cohesion, and ability to execute.
4. **Traction & Financials (20%)** – Current traction, revenue, burn, and runway.
5. **Risks & Red Flags (20%)** – Deduct points for execution risk, unclear business model, or critical weaknesses.

---

### MODIFIERS
- Subtract **2–10 points per major red flag** depending on severity.
- Add **1–5 points per major green flag** depending on impact.
- Do not return "safe" middle scores unless justified.
- Be confident — early-stage startups can vary widely.
- Think like an investor making a go/no-go decision.

---

### SCORING EXAMPLES
- **Score 85–100** → Exceptional startup, strong traction, few or no major risks.
- **Score 70–84** → Promising, minor weaknesses, good potential.
- **Score 50–69** → Unclear potential, mixed strengths and weaknesses.
- **Score 30–49** → Weak team, limited traction, or poor market fit.
- **Score 0–29** → Major flaws, not investable currently.

---

### INPUT DATA
Insights:
${insights}

Red Flags:
${JSON.stringify(redFlags, null, 2)}

Green Flags:
${JSON.stringify(greenFlags, null, 2)}

---

### OUTPUT FORMAT
Return ONLY the final numeric score (0–100), with no text or explanation.
`;

  try {
    const scoreText = await analyzeWithGemma(prompt);

    // Extract the first valid number between 0–100
    const match = scoreText.match(/\b([0-9]{1,3})\b/);
    const score = match ? Math.min(Math.max(parseInt(match[1], 10), 0), 100) : null;

    if (score === null) throw new Error(`Invalid score output: ${scoreText}`);

    return score;
  } catch (error) {
    console.error("⚠️ Scoring failed:", error.message);
    return null;
  }
};


module.exports = { scoreStartup };
