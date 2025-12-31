require('dotenv').config();
const webhook = require('./webhook');
const parser = require('body-parser');
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
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

// validate env
const requiredVars = ['PAGE_ACCESS_TOKEN', 'VERIFY_TOKEN'];
const missing = requiredVars.filter(key => !process.env[key] && !config[key]);

if (missing.length) {
    logger.error(`missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
}

// setup globals
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

// caches with limits
global.sessions = new CacheManager(CONSTANTS.MAX_SESSIONS, CONSTANTS.ONE_HOUR);
global.userCache = new CacheManager(CONSTANTS.MAX_CACHE_SIZE, CONSTANTS.ONE_DAY);
global.messageCache = new CacheManager(CONSTANTS.MAX_CACHE_SIZE, CONSTANTS.SIX_HOURS);

// load commands
function loadCommands(dir) {
    const files = require('fs').readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        
        if (require('fs').statSync(filePath).isDirectory()) {
            return loadCommands(filePath);
        }
        
        if (!file.endsWith('.js')) return;
        
        try {
            delete require.cache[require.resolve(filePath)];
            const cmd = require(filePath);
            
            if (cmd.config?.name) {
                const name = cmd.config.name.toLowerCase();
                global.client.commands.set(name, cmd);
                
                if (cmd.config.aliases) {
                    cmd.config.aliases.forEach(a => 
                        global.client.aliases.set(a.toLowerCase(), name)
                    );
                }
            }
        } catch (e) {
            logger.error(`failed to load ${file}:`, e.message);
        }
    });
}

// cleanup cache files
async function cleanupCache() {
    try {
        await fs.mkdir(global.CACHE_PATH, { recursive: true });
        
        const files = await fs.readdir(global.CACHE_PATH);
        const now = Date.now();
        let cleaned = 0;
        
        for (const file of files) {
            if (file === '.gitkeep') continue;
            
            const filePath = path.join(global.CACHE_PATH, file);
            try {
                const stats = await fs.stat(filePath);
                if (now - stats.mtimeMs > CONSTANTS.ONE_HOUR) {
                    await fs.unlink(filePath);
                    cleaned++;
                }
            } catch (e) {
                // file might be in use, skip
            }
        }
        
        if (cleaned > 0) {
            logger.info(`cleaned ${cleaned} cache files`);
        }
    } catch (e) {
        logger.error('cache cleanup failed:', e.message);
    }
}

// init
(async () => {
    await cleanupCache();
    
    // load bans and settings
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
    
    // middleware
    app.use(parser.json({ limit: '20mb' }));
    app.use(validateInput);
    app.use(rateLimiter);
    
    // routes
    app.get('/', (req, res) => res.json({ 
        status: 'online', 
        bot: global.BOT_NAME,
        commands: global.client.commands.size
    }));
    
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            dbState: mongoose.connection.readyState,
            memory: process.memoryUsage().heapUsed,
            commands: global.client.commands.size,
            sessions: global.sessions.size(),
            cachedUsers: global.userCache.size()
        });
    });
    
    app.get('/metrics', (req, res) => {
        res.json({
            commands: global.client.commands.size,
            sessions: global.sessions.size(),
            users: global.userCache.size(),
            bannedUsers: global.BANNED_USERS.size,
            uptime: process.uptime(),
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'mb'
        });
    });
    
    app.get('/webhook', (req, res) => {
        const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        
        if (req.query['hub.verify_token'] === vToken) {
            res.status(200).send(req.query['hub.challenge']);
        } else {
            res.sendStatus(403);
        }
    });
    
    app.post('/webhook', verifyWebhookSignature, (req, res) => {
        res.sendStatus(200);
        webhook.listen(req.body);
    });
    
    const PORT = process.env.PORT || 8080;
    const server = app.listen(PORT, () => 
        logger.info(`bot running on port ${PORT}`)
    );
    
    // graceful shutdown
    async function shutdown(signal) {
        logger.info(`${signal} received, shutting down gracefully`);
        
        await cleanupCache();
        await mongoose.connection.close();
        
        server.close(() => {
            logger.info('server closed');
            process.exit(0);
        });
        
        // force exit after 10s
        setTimeout(() => {
            logger.warn('forcing shutdown');
            process.exit(1);
        }, 10000);
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // periodic cleanup
    setInterval(cleanupCache, CONSTANTS.CACHE_CLEANUP_INTERVAL);
})();

// error handlers
process.on('unhandledRejection', (err) => {
    logger.error('unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
    logger.error('uncaught exception:', err);
    process.exit(1);
});
