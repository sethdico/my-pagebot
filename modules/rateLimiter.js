const activeRequests = new Map();
module.exports = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const recent = (activeRequests.get(ip) || []).filter(t => now - t < 60000);
    
    if (recent.length >= 30) return res.status(429).send("Too many requests.");
    
    recent.push(now);
    activeRequests.set(ip, recent);
    if (activeRequests.size > 1000) activeRequests.delete(activeRequests.keys().next().value);
    next();
};
