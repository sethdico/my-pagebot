const web = require("./website/web.js");
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");

// --- 🧹 STARTUP CLEANER ---
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
} else {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
        try { fs.unlinkSync(path.join(cacheDir, file)); } catch(e) {}
    }
    console.log("🧹 SYSTEM: Cache cleared on startup.");
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
