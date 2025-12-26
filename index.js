require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require('fs').promises; // Use promises for non-blocking I/O
const app = express();
const config = require("./config.json");

// Configuration
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS?.split(",") || config.ADMINS || []);
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";

const cacheDir = path.join(__dirname, "modules/scripts/commands/cache");
const bannedPath = path.join(__dirname, "modules/scripts/commands/banned.json");

// Startup: Clear Cache (Async)
const initializeCache = async () => {
    try {
        await fs.mkdir(cacheDir, { recursive: true });
        const files = await fs.readdir(cacheDir);
        await Promise.all(files.map(file => fs.unlink(path.join(cacheDir, file))));
    } catch (e) {
        console.warn(`[Cache Warning] ${e.message}`);
    }
};

// Startup: Load Bans (Async)
const loadBans = async () => {
    try {
        const data = await fs.readFile(bannedPath, "utf8");
        const bannedArray = JSON.parse(data);
        if (Array.isArray(bannedArray)) global.BANNED_USERS = new Set(bannedArray);
    } catch (e) {
        // Create file if it doesn't exist
        try { await fs.writeFile(bannedPath, "[]"); } catch (ignore) {}
    }
};

// Command Loader
global.client = { commands: new Map(), aliases: new Map(), cooldowns: new Map() };

const loadCommands = (dir) => {
    const files = require("fs").readdirSync(dir); // Sync is okay for startup only
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (require("fs").statSync(filePath).isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith(".js")) {
            try {
                const cmd = require(filePath);
                if (cmd.config?.name) {
                    const name = cmd.config.name.toLowerCase();
                    global.client.commands.set(name, cmd);
                    if (cmd.config.aliases) {
                        cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
                    }
                }
            } catch (e) { console.error(`[Load Error] ${file}:`, e.message); }
        }
    });
};

(async () => {
    await Promise.all([initializeCache(), loadBans()]);
    loadCommands(path.join(__dirname, "modules/scripts/commands"));
    
    app.use(parser.json({ limit: '20mb' }));

    app.get("/", (req, res) => res.send(`🟢 Amduspage is Online`));

    app.get("/webhook", (req, res) => {
        const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        if (req.query["hub.verify_token"] === vToken) res.status(200).send(req.query["hub.challenge"]);
        else res.sendStatus(403);
    });

    app.post("/webhook", (req, res) => {
        // Process asynchronously to avoid blocking the response
        process.nextTick(() => webhook.listen(req.body));
        res.sendStatus(200);
    });

    // Safety Fix: Prevent infinite loops during crashes
    process.on('unhandledRejection', (reason, p) => {
        console.error('Unhandled Rejection at:', p, 'reason:', reason);
    });

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send("Server Error");
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`Server active on port ${PORT}`));
})();
