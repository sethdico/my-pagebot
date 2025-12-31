require('dotenv').config();
const webhook = require('./webhook');
const parser = require('body-parser');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const db = require('./modules/core/database');
const rateLimiter = require('./modules/middleware/rateLimit');
const { validateInput, verifyWebhookSignature } = require('./modules/middleware/validation');
const CacheManager = require('./modules/core/cache');
const logger = require('./modules/utils/logger');
const config = require('./config/config.json');
const CONSTANTS = require('./config/constants');
const mongoose = require('mongoose');

const app = express();
app.set('trust proxy', 1);

// Validate env
const requiredVars = ['PAGE_ACCESS_TOKEN', 'VERIFY_TOKEN'];
const missing = requiredVars.filter(key => !process.env[key] && !config[key]);

if (missing.length) {
    logger.error(`missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
}

// Setup Globals
global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(
    process.env.ADMINS ? process.env.ADMINS.split(',').filter(Boolean) : (config.ADMINS || [])
);
global.PREFIX = process.env.PREFIX || config.PREFIX || '.';
global.BOT_NAME = process.env.BOT_NAME || config.BOT_NAME || 'Amdusbot';
global.CACHE_PATH = path.join(__dirname, 'cache');
global.client = { commands: new Map(), aliases: new Map() };
global.BANNED_USERS = new Set();
global.log = logger;

// Caches
global.sessions = new CacheManager(CONSTANTS.MAX_SESSIONS, CONSTANTS.ONE_HOUR);
global.userCache = new CacheManager(CONSTANTS.MAX_CACHE_SIZE, CONSTANTS.ONE_DAY);
global.messageCache = new CacheManager(CONSTANTS.MAX_CACHE_SIZE, CONSTANTS.SIX_HOURS);

// Command Loader
function loadCommands(dir) {
    if (!fsSync.existsSync(dir)) return;
    const files = fsSync.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fsSync.statSync(filePath);

        if (stat.isDirectory()) {
            const indexFile = path.join(filePath, 'index.js');
            if (fsSync.existsSync(indexFile)) {
                try {
                    const cmd = require(indexFile);
                    if (cmd.config?.name) registerCommand(cmd);
                } catch (e) {
                    logger.error(`failed to load module ${file}:`, e.message);
                }
            } else {
                loadCommands(filePath);
            }
            return;
        }
        
        if (!file.endsWith('.js')) return;
        
        try {
            delete require.cache[require.resolve(filePath)];
            const cmd = require(filePath);
            registerCommand(cmd);
        } catch (e) {
            logger.error(`failed to load ${file}:`, e.message);
        }
    });
}

function registerCommand(cmd) {
    if (cmd.config?.name) {
        const name = cmd.config.name.toLowerCase();
        global.client.commands.set(name, cmd);
        if (cmd.config.aliases) {
            cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
        }
    }
}

async function cleanupCache() {
    try {
        await fs.mkdir(global.CACHE_PATH, { recursive: true });
        const files = await fs.readdir(global.CACHE_PATH);
        const now = Date.now();
        for (const file of files) {
            if (file === '.gitkeep') continue;
            const filePath = path.join(global.CACHE_PATH, file);
            try {
                const stats = await fs.stat(filePath);
                if (now - stats.mtimeMs > CONSTANTS.ONE_HOUR) await fs.unlink(filePath);
            } catch (e) {}
        }
    } catch (e) { logger.error('cache cleanup failed:', e.message); }
}

(async () => {
    await cleanupCache();
    await new Promise(resolve => {
        db.loadBansIntoMemory(async (banSet) => {
            global.BANNED_USERS = banSet;
            const maintStatus = await db.getSetting('maintenance');
            const maintReason = await db.getSetting('maintenance_reason');
            global.MAINTENANCE_MODE = maintStatus === 'true';
            global.MAINTENANCE_REASON = maintReason || 'bot updating, back soon';
            resolve();
        });
    });
    
    loadCommands(path.join(__dirname, 'modules/commands'));
    logger.info(`loaded ${global.client.commands.size} commands`);
    
    app.use(parser.json({ limit: '20mb' }));
    app.use(validateInput);
    app.use(rateLimiter);
    
    app.get('/', (req, res) => res.json({ status: 'online', bot: global.BOT_NAME, commands: global.client.commands.size }));
    
    app.get('/webhook', (req, res) => {
        const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        if (req.query['hub.verify_token'] === vToken) res.status(200).send(req.query['hub.challenge']);
        else res.sendStatus(403);
    });
    
    app.post('/webhook', verifyWebhookSignature, (req, res) => {
        res.sendStatus(200);
        webhook.listen(req.body);
    });
    
    const PORT = process.env.PORT || 8080;
    const server = app.listen(PORT, () => logger.info(`bot running on port ${PORT}`));
    
    async function shutdown(signal) {
        logger.info(`${signal} received, shutting down gracefully`);
        await cleanupCache();
        await mongoose.connection.close();
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10000);
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    setInterval(cleanupCache, CONSTANTS.CACHE_CLEANUP_INTERVAL);
})();

process.on('unhandledRejection', (err) => logger.error('unhandled rejection:', err));
process.on('uncaughtException', (err) => { logger.error('uncaught exception:', err); process.exit(1); });
