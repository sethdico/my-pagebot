require('dotenv').config(); // ✅ CRITICAL: MUST BE ON LINE 1
const web = require("./website/web.js");
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
const bannedPath = path.join(__dirname, "modules/scripts/commands/banned.json");

if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
} else {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
        try { fs.unlinkSync(path.join(cacheDir, file)); } catch(e) {}
    }
    console.log("🧹 SYSTEM: Cache cleared on startup.");
}

global.BANNED_USERS = new Set();
try {
    if (fs.existsSync(bannedPath)) {
        const rawData = fs.readFileSync(bannedPath, "utf-8");
        const bannedArray = JSON.parse(rawData);
        if (Array.isArray(bannedArray)) {
            global.BANNED_USERS = new Set(bannedArray);
        }
    }
    console.log(`🚫 Loaded ${global.BANNED_USERS.size} banned users.`);
} catch (e) {
    console.error("⚠️ Failed to load ban list:", e.message);
    if (!fs.existsSync(bannedPath)) fs.writeFileSync(bannedPath, "[]");
}

global.client = {
    commands: new Map(),
    aliases: new Map(),
    cooldowns: new Map()
};

const commandsPath = path.join(__dirname, "modules/scripts/commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

console.log(`📦 Loading ${commandFiles.length} commands...`);

for (const file of commandFiles) {
    try {
        const cmd = require(path.join(commandsPath, file));
        if (cmd.config && cmd.config.name) {
            global.client.commands.set(cmd.config.name.toLowerCase(), cmd);
            if (cmd.config.aliases && Array.isArray(cmd.config.aliases)) {
                cmd.config.aliases.forEach(alias => {
                    global.client.aliases.set(alias.toLowerCase(), cmd.config.name.toLowerCase());
                });
            }
        }
    } catch (e) {
        console.error(`❌ Failed to load ${file}:`, e.message);
    }
}
console.log(`✅ Commands loaded successfully!`);

app.use(parser.json({ limit: '10mb' }));
app.use(express.static("website"));

app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

app.get("/", (req, res) => { web.html(res); });
app.get("/webhook", (req, res) => { web.verify(req, res); });
app.post("/webhook", (req, res) => {
    webhook.listen(req.body);
    res.sendStatus(200);
});

app.use((err, req, res, next) => {
  console.error("🔥 Critical Server Error:", err.stack);
  res.status(500).send("Internal Server Error");
  const errorLog = `[${new Date().toISOString()}] ${err.stack}\n`;
  fs.appendFile(path.join(__dirname, "error.log"), errorLog, () => {});
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  web.log();
  console.log(`✅ Server running on port ${PORT}`);
});
