const CONSTANTS = require('../../config/constants');

const activeRequests = new Map();

function rateLimiter(req, res, next) {
    // facebook bypass
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('facebookexternalhit')) {
        return next();
    }

    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    const recent = (activeRequests.get(ip) || [])
        .filter(t => now - t < 60000);
    
    if (recent.length >= CONSTANTS.REQUESTS_PER_MINUTE) {
        return res.status(429).json({ 
            error: 'too many requests',
            retryAfter: 60 
        });
    }
    
    recent.push(now);
    activeRequests.set(ip, recent);
    
    next();
}

// cleanup every 5 min
setInterval(() => {
    const now = Date.now();
    for (const [ip, times] of activeRequests.entries()) {
        const recent = times.filter(t => now - t < 60000);
        if (recent.length === 0) {
            activeRequests.delete(ip);
        } else {
            activeRequests.set(ip, recent);
        }
    }
}, CONSTANTS.CLEANUP_INTERVAL);

module.exports = rateLimiter;
