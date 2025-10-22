import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

export const analyzeWithGemini = async (text, opts = {}) => {
  const {
    model = "gemini-1.5-pro",
    temperature = 0.7,
  } = opts;

  const systemPrompt =
    "You are a venture analyst providing structured, professional, and exhaustive critiques of startups for investors.";

  const geminiModel = genAI.getGenerativeModel({ model });

  try {
    const result = await geminiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nUser query:\n${text}`,
            },
          ],
        },
      ],
      generationConfig: { temperature },
    });

    return result.response.text();
  } catch (err) {
    console.error("❌ Gemini API error:", err.message);
    throw err;
  }
};