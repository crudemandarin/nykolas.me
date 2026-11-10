const express = require("express");
const router = express.Router();

/* GET / */

router.get("/", (req, res) => {
	const data = require("../../data/skills.json");
	res.status(200).json({ skills: data });
});

module.exports = router;
