const xlsx = require("xlsx");
const { analyzeWithGemma } = require("../services/llmService");

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

    if (!excelFile) {
      return res.status(400).json({ error: "Excel file is required" });
    }

    const excelText = extractTextFromExcel(excelFile.buffer);
    const parsedData = parseExcelData(excelText);

    // Send extracted text to Gemma LLM
    // const insights = await analyzeWithGemma(`Financials:\n${excelText}`);

    return res.json({ parsedData });
  } catch (error) {
    console.error("File processing error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { handleFileUpload };
