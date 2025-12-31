require('dotenv').config();
const webhook = require("./webhook.js");
const parser = require("body-parser");
const express = require("express");
const path = require("path");
const fs = require('fs').promises;
const db = require("./modules/database");
const rateLimiter = require("./modules/rateLimiter");
const config = require("./config.json");
const mongoose = require('mongoose');

const app = express();
app.set('trust proxy', 1); 

// validate required env vars
const requiredVars = ['PAGE_ACCESS_TOKEN', 'VERIFY_TOKEN'];
const missing = requiredVars.filter(key => !process.env[key] && !config[key]);
if (missing.length) {
    console.error(`❌ missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
}

// setup globals
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS ? process.env.ADMINS.split(",").filter(Boolean) : (config.ADMINS || []));
global.PREFIX = process.env.PREFIX || config.PREFIX || ".";
global.CACHE_PATH = path.join(__dirname, "cache");
global.client = { commands: new Map(), aliases: new Map() };
global.BANNED_USERS = new Set();
global.sessions = new Map(); 
global.userCache = new Map();

global.log = {
    info: (...args) => process.env.NODE_ENV === 'dev' && console.log(...args),
    error: (...args) => console.error(...args),
    debug: (...args) => process.env.DEBUG === 'true' && console.log(...args)
};

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
                if (cmd.config.aliases) {
                    cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
                }
            }
        } catch (e) {
            global.log.error(`failed to load ${file}:`, e.message);
        }
    });
};

(async () => {
    try { 
        await fs.mkdir(global.CACHE_PATH, { recursive: true });
        
        // Clean cache on boot
        const files = await fs.readdir(global.CACHE_PATH);
        for (const file of files) {
            if (file !== '.gitkeep') await fs.unlink(path.join(global.CACHE_PATH, file));
        }
        global.log.info('cache cleaned');
    } catch (e) {
        global.log.error('cache cleanup failed:', e.message);
    }

    // Load data from DB
    await new Promise(resolve => {
        db.loadBansIntoMemory(async (banSet) => { 
            global.BANNED_USERS = banSet; 
            const maintStatus = await db.getSetting("maintenance");
            const maintReason = await db.getSetting("maintenance_reason");
            global.MAINTENANCE_MODE = maintStatus === "true";
            global.MAINTENANCE_REASON = maintReason || "bot is updating rn, be back soon";
            resolve();
        });
    });

    loadCommands(path.join(__dirname, "modules/scripts/commands"));
    console.log(`loaded ${global.client.commands.size} commands`);

    app.use(parser.json({ limit: '20mb' }));
    app.use(rateLimiter);

    app.get("/", (req, res) => res.send("🟢 bot is online"));
    
    // Health check for hosting services
    app.get("/health", (req, res) => {
        res.json({
            status: "ok",
            uptime: process.uptime(),
            dbState: mongoose.connection.readyState
        });
    });
    
    app.get("/webhook", (req, res) => {
        const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        if (req.query["hub.verify_token"] === vToken) {
            res.status(200).send(req.query["hub.challenge"]);
        } else {
            res.sendStatus(403);
        }
    });

    app.post("/webhook", (req, res) => {
        res.sendStatus(200);
        webhook.listen(req.body);
    });

    const PORT = process.env.PORT || 8080;
    const server = app.listen(PORT, () => console.log(`🚀 running on port ${PORT}`));

    // Graceful Shutdown
    process.on('SIGTERM', async () => {
        console.log('shutting down gracefully');
        await mongoose.connection.close();
        server.close(() => process.exit(0));
    });
})();

process.on('unhandledRejection', (err) => console.error('unhandled error:', err));
process.on('uncaughtException', (err) => {
    console.error('critical error:', err);
    process.exit(1);
});
