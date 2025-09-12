const fetch = require("node-fetch");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const analyzeWithGemma = async (text) => {
  const res = await fetch("https://openrouter.ai/api/v1/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemma-3-27b-it:free",
      prompt: `Analyze the following document and provide insights:\n\n${text}`,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.text || "No insights generated.";
};

module.exports = { analyzeWithGemma };
