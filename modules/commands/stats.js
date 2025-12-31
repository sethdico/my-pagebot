const os = require('os');
const db = require("../../database");

module.exports.config = {
    name: "stats", 
    author: "Sethdico", 
    version: "3.0", 
    category: "Admin", 
    adminOnly: true, 
    usePrefix: false, 
    cooldown: 5
};

module.exports.run = async function ({ reply }) {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const hrs = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);

    const topCmds = await db.getStats();
    const totalUsers = await db.UserStat.countDocuments();
    const activeToday = await db.UserStat.countDocuments({ 
        lastActive: { $gte: new Date(Date.now() - 86400000) } 
    });

    let msg = `system stats\n\n`;
    
    msg += `bot\n`;
    msg += `commands: ${global.client.commands.size}\n`;
    msg += `sessions: ${global.sessions.size}\n`;
    msg += `banned: ${global.BANNED_USERS.size}\n\n`;

    msg += `users\n`;
    msg += `total: ${totalUsers}\n`;
    msg += `active (24h): ${activeToday}\n\n`;

    if (topCmds.length > 0) {
        msg += `top commands\n`;
        topCmds.slice(0, 5).forEach(c => {
            msg += `${c.command}: ${c.count}\n`;
        });
        msg += `\n`;
    }

    msg += `system\n`;
    msg += `memory: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}mb\n`;
    msg += `uptime: ${hrs}h ${mins}m\n`;
    msg += `platform: ${os.platform()}`;

    reply(msg);
};
