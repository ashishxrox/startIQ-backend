const express = require('express');
const cors = require("cors");
require('dotenv').config();
const usersRoutes = require("./routes/users.js")
const uploadRoutes = require("./routes/uploadRoutes.js")
const anaylse = require('./routes/analyse.js')
const analyseInvestor = require('./routes/analyseInvestor.js')
const investor = require('./routes/investorRoutes.js')
// import usersRoutes from "./routes/users.js";
console.log("🟢 Importing Firebase...");
const firebase = require("./firebase.js");
console.log("✅ Firebase initialized");

const app = express();
const PORT = process.env.PORT || 5001;

console.log("🚀 Setting up middlewares...");
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://startiq.netlify.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
console.log("✅ Middlewares ready");

// Routes
console.log("🛣️ Registering routes...");
app.use("/users", usersRoutes);
app.use("/api", uploadRoutes);
app.use("/intell", anaylse);
app.use("/intell/investor", analyseInvestor);
app.use("/investor", investor);
console.log("✅ Routes registered");

// Health check
app.get("/", (req, res) => {
  console.log("💬 Health check route hit!");
  res.send("✅ StartIQ backend running...");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
