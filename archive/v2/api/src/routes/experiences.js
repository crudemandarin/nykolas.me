const express = require("express");
const router = express.Router();

/* GET / */

router.get("/", (req, res) => {
	const data = require("../../data/experiences.json");
	res.status(200).json({ experiences: data });
});

module.exports = router;
