const activeRequests = new Map();
module.exports = (req, res, next) => {
    // Check if request is from Facebook Webhook
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('facebookexternalhit')) return next();

    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const recent = (activeRequests.get(ip) || []).filter(t => now - t < 60000);
    
    // Increased limit to 100 for webhook reliability
    if (recent.length >= 100) return res.status(429).send("Too many requests.");
    
    recent.push(now);
    activeRequests.set(ip, recent);
    next();
};
