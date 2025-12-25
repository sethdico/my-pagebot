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

// --- 🧹 startup cleaner ---
const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
else fs.readdirSync(cacheDir).forEach(f => { try { fs.unlinkSync(path.join(cacheDir, f)) } catch(e) {} });

// --- 🚀 recursive loader ---
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
            } catch (e) { console.error(`❌ failed to load ${file}`); }
        }
    }
};
loadCommands(path.join(__dirname, "modules/scripts/commands"));

app.use(parser.json({ limit: '10mb' }));

app.get("/", (req, res) => res.send(`<h1>${config.BOTNAME || "bot"} is active</h1>`));
app.get("/webhook", (req, res) => {
    const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
    if (req.query["hub.verify_token"] === vToken) res.status(200).send(req.query["hub.challenge"]);
    else res.sendStatus(403);
});
app.post("/webhook", (req, res) => { webhook.listen(req.body); res.sendStatus(200); });

// ✅ error alert for admins
app.use(async (err, req, res, next) => {
    console.error("🔥 critical error:", err.stack);
    if (global.api) {
        global.ADMINS.forEach(id => {
            global.api.sendMessage(`⚠️ **crash report**\n\n${err.message}`, id).catch(() => {});
        });
    }
    res.status(500).send("internal error");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ amdusbot active on ${PORT}`));
