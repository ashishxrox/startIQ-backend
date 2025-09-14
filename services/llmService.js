// services/llmService.js
const axios = require("axios");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const analyzeWithGemma = async (text, opts = {}) => {
  const {
    temperature = 0.7,
    max_tokens = 1500,
  } = opts;

  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemma-3-27b-it:free",
        messages: [
          {
            role: "system",
            content:
              "You are a venture analyst providing structured, professional, and exhaustive critiques of startups for investors.",
          },
          { role: "user", content: text },
        ],
        max_tokens,
        temperature,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
      }
    );

    return res.data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("❌ OpenRouter API error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { analyzeWithGemma };
