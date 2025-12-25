require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

const config = require("./config.json");

// ✅ Cache Admin List as a Set for O(1) speed
global.ADMINS = new Set(process.env.ADMINS?.split(",") || config.ADMINS || []);

// --- 🧹 STARTUP CLEANER ---
const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
else fs.readdirSync(cacheDir).forEach(f => { try { fs.unlinkSync(path.join(cacheDir, f)) } catch(e) {} });

// --- 🚀 RECURSIVE COMMAND LOADER ---
global.client = { commands: new Map(), aliases: new Map(), cooldowns: new Map() };

const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath); // Search subfolders
        } else if (file.endsWith(".js")) {
            try {
                const cmd = require(filePath);
                if (cmd.config?.name) {
                    const name = cmd.config.name.toLowerCase();
                    global.client.commands.set(name, cmd);
                    if (cmd.config.aliases) cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
                }
            } catch (e) { console.error(`❌ Failed to load ${file}:`, e.message); }
        }
    }
};
loadCommands(path.join(__dirname, "modules/scripts/commands"));

app.use(parser.json({ limit: '10mb' }));

app.get("/", (req, res) => res.send(`<h1>${config.BOTNAME} is Active</h1>`));
app.get("/webhook", (req, res) => {
    const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
    if (req.query["hub.verify_token"] === vToken) res.status(200).send(req.query["hub.challenge"]);
    else res.sendStatus(403);
});
app.post("/webhook", (req, res) => { webhook.listen(req.body); res.sendStatus(200); });

// ✅ GLOBAL ERROR REPORTER (Notifies Admin on Messenger)
app.use(async (err, req, res, next) => {
    console.error("🔥 CRITICAL ERROR:", err.stack);
    const api = global.api;
    if (api) {
        global.ADMINS.forEach(id => {
            api.sendMessage(`⚠️ **BOT CRASH REPORT**\n\nError: ${err.message}\n\nCheck logs for details.`, id).catch(() => {});
        });
    }
    res.status(500).send("Internal Error");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Amdusbot Active on ${PORT}`));
