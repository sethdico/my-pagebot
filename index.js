require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const config = require("./config.json");

// ✅ set globals once at startup
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS?.split(",") || config.ADMINS || []);
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
const bannedPath = path.join(__dirname, "modules/scripts/commands/banned.json");

// --- 🧹 startup cleaner ---
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
} else {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
        try { fs.unlinkSync(path.join(cacheDir, file)); } catch(e) {}
    }
    console.log("🧹 system: cache cleared.");
}

// --- 🚫 load banned users ---
global.BANNED_USERS = new Set();
try {
    if (fs.existsSync(bannedPath)) {
        const bannedArray = JSON.parse(fs.readFileSync(bannedPath, "utf-8"));
        if (Array.isArray(bannedArray)) global.BANNED_USERS = new Set(bannedArray);
    }
} catch (e) {
    if (!fs.existsSync(bannedPath)) fs.writeFileSync(bannedPath, "[]");
}

// --- 🚀 recursive command loader ---
global.client = { commands: new Map(), aliases: new Map(), cooldowns: new Map() };

const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
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
            } catch (e) { console.error(`❌ failed to load ${file}:`, e.message); }
        }
    }
};
loadCommands(path.join(__dirname, "modules/scripts/commands"));

app.use(parser.json({ limit: '10mb' }));

// --- 🌐 routes ---
app.get("/", (req, res) => res.send(`<h1>${config.BOTNAME || "bot"} is active</h1>`));

app.get("/webhook", (req, res) => {
    const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
    if (req.query["hub.verify_token"] === vToken) {
        res.status(200).send(req.query["hub.challenge"]);
    } else { res.sendStatus(403); }
});

app.post("/webhook", (req, res) => {
    webhook.listen(req.body);
    res.sendStatus(200);
});

// ✅ global error alert for admins
app.use(async (err, req, res, next) => {
    console.error("🔥 critical error:", err.stack);
    if (global.api) {
        global.ADMINS.forEach(id => {
            global.api.sendMessage(`⚠️ **crash report**\n\nerror: ${err.message}`, id).catch(() => {});
        });
    }
    res.status(500).send("internal error");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ amdusbot active on ${PORT}`));
