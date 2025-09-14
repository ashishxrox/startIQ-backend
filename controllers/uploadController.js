const xlsx = require("xlsx");
const { analyzeWithGemma } = require("../services/llmService");
const { db, admin } = require("../firebase"); // ✅ import Firestore

// Extract text from Excel buffer
const extractTextFromExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = xlsx.utils.sheet_to_json(sheet);
  return JSON.stringify(json, null, 2);
};

function parseExcelData(input) {
  // Parse the JSON string stored in the "excelText" property
  return JSON.parse(input);
}


const handleFileUpload = async (req, res) => {
  try {
    const excelFile = req.file;
    const ytLink = req.ytLink; // YouTube lin
    const startupID = req.startupID

    console.log("STARTUPID-> ",startupID)

    if (!excelFile) {
      return res.status(400).json({ error: "Excel file is required" });
    }

    const excelText = extractTextFromExcel(excelFile.buffer);
    const financials = parseExcelData(excelText);

    // Send extracted text to Gemma LLM
    // const insights = await analyzeWithGemma(`Financials:\n${excelText}`);

    // 🔹 Save to Firestore: documents/{startupID}
    await db.collection("documents").doc(startupID).set({
      financials,
      ytLink,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Saved documents for startupID: ${startupID}`);


    return res.json({ 
      message: "Documents saved successfully",
      startupID,
      financials,
      ytLink
    });
  } catch (error) {
    console.error("File processing error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { handleFileUpload };
