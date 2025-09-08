const express = require('express');
const cors = require("cors");
require('dotenv').config();
const usersRoutes = require("./routes/users.js")
// import usersRoutes from "./routes/users.js";
const firebase = require("./firebase.js"); // make sure Firebase initializes before routes


const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors())
app.use(express.json());

// Routes
app.use("/users", usersRoutes);

// Health check
app.get("/", (req, res) => res.send("✅ StartIQ backend running..."));


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});