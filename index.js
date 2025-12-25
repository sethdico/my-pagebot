require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const config = require("./config.json");

// ✅ Global Cache Setup
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS?.split(",") || config.ADMINS || []);
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
const bannedPath = path.join(__dirname, "modules/scripts/commands/banned.json");

// --- 🧹 Startup Cleaner ---
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
} else {
    fs.readdirSync(cacheDir).forEach(file => {
        try { fs.unlinkSync(path.join(cacheDir, file)); } catch(e) {}
    });
}

// --- 🚫 Ban Loader ---
global.BANNED_USERS = new Set();
try {
    if (fs.existsSync(bannedPath)) {
        const bannedArray = JSON.parse(fs.readFileSync(bannedPath, "utf-8"));
        if (Array.isArray(bannedArray)) global.BANNED_USERS = new Set(bannedArray);
    }
} catch (e) {
    if (!fs.existsSync(bannedPath)) fs.writeFileSync(bannedPath, "[]");
}

// --- 🚀 Recursive Command Loader ---
global.client = { commands: new Map(), aliases: new Map(), cooldowns: new Map() };

const loadCommands = (dir) => {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith(".js")) {
            try {
                const cmd = require(filePath);
                if (cmd.config?.name) {
                    const name = cmd.config.name.toLowerCase();
                    global.client.commands.set(name, cmd);
                    if (cmd.config.aliases) cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
                }
            } catch (e) { console.error(`❌ Load Error: ${file}`); }
        }
    });
};
loadCommands(path.join(__dirname, "modules/scripts/commands"));

app.use(parser.json({ limit: '10mb' }));

app.get("/", (req, res) => res.send(`<h1>${config.BOTNAME} is Active</h1>`));

app.get("/webhook", (req, res) => {
    const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
    if (req.query["hub.verify_token"] === vToken) res.status(200).send(req.query["hub.challenge"]);
    else res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
    webhook.listen(req.body);
    res.sendStatus(200);
});

// ✅ Admin Crash Alerts
app.use(async (err, req, res, next) => {
    console.error(err.stack);
    if (global.api) global.ADMINS.forEach(id => global.api.sendMessage(`⚠️ crash: ${err.message}`, id).catch(() => {}));
    res.status(500).send("internal error");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ amdusbot active on ${PORT}`));
