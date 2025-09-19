// utils/llmUtils.js
function cleanJSONArrayResponse(raw) {
  if (!raw) return [];

  let text = raw.trim();

  // 1. Remove code fences (```json ... ```)
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  // 2. If the model returned an array as a string, try parsing
  try {
    const parsed = JSON.parse(text);

    // Case: it's already a proper array
    if (Array.isArray(parsed)) {
      return parsed;
    }

    // Case: model wrapped array in string → try parsing again
    if (typeof parsed === "string") {
      return JSON.parse(parsed);
    }

    // Fallback → return as single-element array
    return [text];
  } catch {
    // Last fallback → wrap plain text
    return [text];
  }
}

module.exports = { cleanJSONArrayResponse };
