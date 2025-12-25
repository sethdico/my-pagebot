require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
const bannedPath = path.join(__dirname, "modules/scripts/commands/banned.json");
const config = require("./config.json");

// --- 🧹 STARTUP CLEANER ---
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
} else {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
        try { fs.unlinkSync(path.join(cacheDir, file)); } catch(e) {}
    }
}

// --- 🚫 LOAD BANNED USERS ---
global.BANNED_USERS = new Set();
try {
    if (fs.existsSync(bannedPath)) {
        const bannedArray = JSON.parse(fs.readFileSync(bannedPath, "utf-8"));
        if (Array.isArray(bannedArray)) global.BANNED_USERS = new Set(bannedArray);
    }
} catch (e) {
    if (!fs.existsSync(bannedPath)) fs.writeFileSync(bannedPath, "[]");
}

// --- 🚀 GLOBAL COMMAND LOADER ---
global.client = { commands: new Map(), aliases: new Map(), cooldowns: new Map() };
const commandsPath = path.join(__dirname, "modules/scripts/commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    try {
        const cmd = require(path.join(commandsPath, file));
        if (cmd.config && cmd.config.name) {
            global.client.commands.set(cmd.config.name.toLowerCase(), cmd);
            if (cmd.config.aliases && Array.isArray(cmd.config.aliases)) {
                cmd.config.aliases.forEach(alias => global.client.aliases.set(alias.toLowerCase(), cmd.config.name.toLowerCase()));
            }
        }
    } catch (e) { console.error(`❌ Load Error ${file}:`, e.message); }
}

app.use(parser.json({ limit: '10mb' }));

// --- 🌐 ROUTES (No longer uses website folder) ---
app.get("/", (req, res) => res.send(`<h1>${config.BOTNAME || "Bot"} is running</h1>`));

app.get("/webhook", (req, res) => {
    const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
    if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === vToken) {
        res.status(200).send(req.query["hub.challenge"]);
    } else { res.sendStatus(403); }
});

app.post("/webhook", (req, res) => {
    webhook.listen(req.body);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ [SYSTEM] Amdusbot Active on Port ${PORT}`));
