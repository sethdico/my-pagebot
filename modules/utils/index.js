const http = require('./http');
const helpers = require('./helpers');
const logger = require('./logger');

// Consolidate exports to match old utils.js structure
module.exports = {
    ...http,    // exports http, cachedRequest
    ...helpers, // exports sanitize, parseAI, getEventType, etc.
    log: (event) => {
        if (!event.sender) return;
        const type = global.ADMINS?.has(event.sender.id) ? "admin" : "user";
        const text = event.message?.text || "media";
        logger.info(`[${type}] ${event.sender.id}: ${text}`);
    },
    // Add alias for fetchWithRetry if it was used before
    fetchWithRetry: helpers.retry 
};
