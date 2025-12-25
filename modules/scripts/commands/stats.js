const os = require('os');

module.exports.config = {
    name: "stats",
    author: "Sethdico",
    version: "1.1",
    category: "Admin",
    description: "check bot health.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 5
};

module.exports.run = async function ({ reply }) {
    try {
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        
        const hrs = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);

        const msg = `📊 **stats**
━━━━━━━━━━━━━━━━
🤖 **cmds:** ${global.client?.commands?.size || 0}
🛡️ **admins:** ${global.ADMINS?.size || 0}
🚫 **banned:** ${global.BANNED_USERS?.size || 0}

🧠 **memory**
• used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB
• total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB

🖥️ **system**
• load: ${os.loadavg()[0].toFixed(2)}
• uptime: ${hrs}h ${mins}m
• platform: ${os.platform()}`;

        return reply(msg);
    } catch (e) {
        console.error(e);
        return reply("❌ stats failed. check logs.");
    }
};
