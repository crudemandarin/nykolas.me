const app = require("./app");

const PORT = 8000;

app.listen(PORT, () => {
	console.log("--> nykolas.me API");
	console.log(`--> Listening at http://localhost:${PORT}`);
});
