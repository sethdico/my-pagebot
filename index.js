require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const config = require("./config.json");

// Configuration
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS?.split(",") || config.ADMINS || []);
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
const bannedPath = path.join(__dirname, "modules/scripts/commands/banned.json");

// Startup: Clear cache
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
} else {
    try {
        fs.readdirSync(cacheDir).forEach(file => fs.unlinkSync(path.join(cacheDir, file)));
    } catch(e) {}
}

// Startup: Load Bans
global.BANNED_USERS = new Set();
try {
    if (fs.existsSync(bannedPath)) {
        const bannedArray = JSON.parse(fs.readFileSync(bannedPath, "utf-8"));
        if (Array.isArray(bannedArray)) global.BANNED_USERS = new Set(bannedArray);
    }
} catch (e) {
    if (!fs.existsSync(bannedPath)) fs.writeFileSync(bannedPath, "[]");
}

// Command Loader
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
            } catch (e) { console.error(`[Load Error] ${file}: ${e.message}`); }
        }
    });
};
loadCommands(path.join(__dirname, "modules/scripts/commands"));

app.use(parser.json({ limit: '20mb' }));

app.get("/", (req, res) => res.send(`🟢 Amduspage is Online`));

app.get("/webhook", (req, res) => {
    const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
    if (req.query["hub.verify_token"] === vToken) res.status(200).send(req.query["hub.challenge"]);
    else res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
    webhook.listen(req.body);
    res.sendStatus(200);
});

// SAFETY FIX: Prevent infinite loops during crashes
process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

// Standard error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Server Error");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server active on port ${PORT}`));
