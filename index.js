const web = require("./website/web.js");
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require("fs"); // Added for safety
const app = express();

// --- 🛡️ SAFETY NET: AUTO-CREATE CACHE ---
const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log("📁 SYSTEM: Created missing cache directory.");
}

app.use(parser.json());
app.use(express.static("website"));

app.get("/", (req, res) => { web.html(res); });
app.get("/webhook", (req, res) => { web.verify(req, res); });
app.post("/webhook", (req, res) => {
    webhook.listen(req.body);
    res.sendStatus(200);
});

app.listen(process.env.PORT || 8080, () => {
  web.log();
});
