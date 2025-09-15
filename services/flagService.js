// services/flagService.js
const { analyzeWithGemma } = require("./llmService");

const extractRedFlags = async (insights) => {
  const prompt = `
You are an AI that extracts investor red flags ONLY in JSON format.

TASK:
- Identify up to 5 critical red flags from the startup analysis below.
- Return STRICTLY as a valid JSON array of short strings. 
- Do not add explanations, sentences, or any text outside the array.
- Example valid output: ["High burn rate", "Unproven market"]
- If there are no clear red flags, return [].

Startup Analysis:
${insights}

Now output ONLY the JSON array:
`;
  try {
    // Request deterministic output specifically for flags
    const flagsText = await analyzeWithGemma(prompt, { temperature: 0.0, max_tokens: 300 });

    // 1) Try direct parse
    try {
      const parsed = JSON.parse(flagsText);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(s => s.trim()).filter(Boolean).slice(0, 5);
      }
    } catch (e) {
      // continue to extraction attempts
    }

    // 2) Try to extract the first JSON array substring: [...], supports multi-line inside
    const arrayMatch = flagsText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map(String).map(s => s.trim()).filter(Boolean).slice(0, 5);
        }
      } catch (e) {
        console.warn("Failed to JSON.parse matched array substring:", e.message);
      }
    }

    // 3) Fallback: extract lines that look like bullet points (best-effort)
    const lines = flagsText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    // Convert lines like "- High burn rate" or "1. High burn rate" to plain strings
    const candidates = lines.map(l => l.replace(/^[-•\d\.\)\s]+/, "").trim()).filter(Boolean);

    if (candidates.length) {
      return candidates.slice(0, 5);
    }

    // Final fallback: return empty array
    return [];
  } catch (error) {
    console.error("⚠️ Flag extraction failed:", error.message || error);
    return [];
  }
};

const extractGreenFlags = async (insights) => {
  const prompt = `
You are an AI that extracts investor green flags ONLY in JSON format.

TASK:
- Identify up to 5 strong positive signals ("green flags") from the startup analysis below.
- Return STRICTLY as a valid JSON array of short strings.
- Do not add explanations, sentences, or any text outside the array.
- Example valid output: ["Strong founder experience", "Growing customer base"]
- If there are no clear green flags, return [].

Startup Analysis:
${insights}

Now output ONLY the JSON array:
`;


  try {
    // Request deterministic output specifically for flags
    const flagsText = await analyzeWithGemma(prompt, { temperature: 0.0, max_tokens: 300 });
    console.log("raw flags output from model:", flagsText);

    // 1) Try direct parse
    try {
      const parsed = JSON.parse(flagsText);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(s => s.trim()).filter(Boolean).slice(0, 5);
      }
    } catch (e) {
      // continue to extraction attempts
    }

    // 2) Try to extract the first JSON array substring: [...], supports multi-line inside
    const arrayMatch = flagsText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.map(String).map(s => s.trim()).filter(Boolean).slice(0, 5);
        }
      } catch (e) {
        console.warn("Failed to JSON.parse matched array substring:", e.message);
      }
    }

    // 3) Fallback: extract lines that look like bullet points (best-effort)
    const lines = flagsText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    // Convert lines like "- High burn rate" or "1. High burn rate" to plain strings
    const candidates = lines.map(l => l.replace(/^[-•\d\.\)\s]+/, "").trim()).filter(Boolean);

    if (candidates.length) {
      return candidates.slice(0, 5);
    }

    // Final fallback: return empty array
    return [];
  } catch (error) {
    console.error("⚠️ Flag extraction failed:", error.message || error);
    return [];
  }
};

module.exports = { extractRedFlags, extractGreenFlags };
