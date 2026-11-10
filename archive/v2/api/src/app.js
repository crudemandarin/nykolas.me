const express = require("express");
const cors = require("cors");

const app = express();

// Configuration
app.use(express.json());
app.use(cors());

// Routes
app.use("/", require("./routes/index"));
app.use("/experiences", require("./routes/experiences"));
app.use("/skills", require("./routes/skills"));
app.use("/projects", require("./routes/projects"));

// Default to 404 if Endpoint/Method Not Recognized
app.use((req, res, next) => res.status(404).json({ message: "Not found" }));

module.exports = app;
