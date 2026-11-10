const express = require("express");
const router = express.Router();

/* GET / */

router.get("/", (req, res) => {
	const data = require("../../data/projects.json");
	res.status(200).json({ projects: data });
});

module.exports = router;
