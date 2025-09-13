const express = require('express');
const cors = require("cors");
require('dotenv').config();
const usersRoutes = require("./routes/users.js")
const uploadRoutes = require("./routes/uploadRoutes.js")
// import usersRoutes from "./routes/users.js";
const firebase = require("./firebase.js"); // make sure Firebase initializes before routes


const app = express();
const PORT = process.env.PORT || 5001;

// ✅ allow your frontend origin
app.use(
  cors({
    origin: [
      "http://localhost:5174",           // local dev
      "https://startiq.netlify.app",     // deployed frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);


app.use(express.json());

// Routes
app.use("/users", usersRoutes);
app.use("/api", uploadRoutes);

// Health check
app.get("/", (req, res) => res.send("✅ StartIQ backend running..."));


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});