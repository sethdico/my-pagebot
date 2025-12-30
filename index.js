require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require('fs').promises;
const db = require("./modules/database");
const rateLimiter = require("./modules/rateLimiter");
const config = require("./config.json");

const app = express();
app.set('trust proxy', 1); 

global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS ? process.env.ADMINS.split(",").filter(Boolean) : (config.ADMINS || []));
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";
global.CACHE_PATH = path.join(__dirname, "cache");
global.client = { commands: new Map(), aliases: new Map() };
global.BANNED_USERS = new Set();

const loadCommands = (dir) => {
    const files = require("fs").readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (require("fs").statSync(filePath).isDirectory()) return loadCommands(filePath);
        if (!file.endsWith(".js")) return;
        try {
            const cmd = require(filePath);
            if (cmd.config?.name) {
                const name = cmd.config.name.toLowerCase();
                global.client.commands.set(name, cmd);
                if (cmd.config.aliases) cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
            }
        } catch (e) {}
    });
};

(async () => {
    try { 
        await require('fs').promises.mkdir(global.CACHE_PATH, { recursive: true });
        const files = await fs.readdir(global.CACHE_PATH);
        for (const file of files) await fs.unlink(path.join(global.CACHE_PATH, file));
    } catch (e) {}

    db.loadBansIntoMemory(banSet => { global.BANNED_USERS = banSet; });
    const maintStatus = await db.getSetting("maintenance");
    const maintReason = await db.getSetting("maintenance_reason");
    global.MAINTENANCE_MODE = maintStatus === "true";
    global.MAINTENANCE_REASON = maintReason || "The owner is currently updating and fixing the bot.";

    loadCommands(path.join(__dirname, "modules/scripts/commands"));
    
    app.use(parser.json({ limit: '20mb' }));
    app.use(rateLimiter);

    app.get("/", (req, res) => res.send("🟢 System Optimal"));
    app.get("/webhook", (req, res) => {
        const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        if (req.query["hub.verify_token"] === vToken) res.status(200).send(req.query["hub.challenge"]);
        else res.sendStatus(403);
    });
    app.post("/webhook", (req, res) => { webhook.listen(req.body); res.sendStatus(200); });

    // Autoclean cache every 1 hour
    setInterval(async () => {
        try {
            const files = await fs.readdir(global.CACHE_PATH);
            for (const file of files) if (file !== '.gitkeep') await fs.unlink(path.join(global.CACHE_PATH, file));
        } catch (e) {}
    }, 3600000);

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`🚀 Online on port ${PORT}`));
})();
