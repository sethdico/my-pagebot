const os = require('os');
const db = require("../../database");

module.exports.config = {
    name: "stats", author: "Sethdico", version: "2.1", category: "Admin", adminOnly: true, usePrefix: false, cooldown: 5
};

module.exports.run = async function ({ reply }) {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const hrs = Math.floor(uptime / 3600);
    const mins = Math.floor((uptime % 3600) / 60);

    const topCmds = await db.getStats();
    const usageMsg = topCmds.slice(0, 5).map(c => `• ${c.command}: ${c.count}`).join("\n") || "No data yet.";
    
    const totalUsers = await db.UserStat.countDocuments();
    const activeToday = await db.UserStat.countDocuments({ lastActive: { $gte: new Date(Date.now() - 86400000) } });

    const msg = `📊 **SYSTEM STATS**
────────────────
🤖 **BOT:**
• Commands: ${global.client.commands.size}
• Active Sessions: ${global.sessions.size}
• Banned: ${global.BANNED_USERS.size}

👥 **USERS:**
• Total: ${totalUsers}
• Active (24h): ${activeToday}

📈 **TOP COMMANDS:**
${usageMsg}

🧠 **MEMORY:** ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB
🖥️ **UPTIME:** ${hrs}h ${mins}m
📡 **PLATFORM:** ${os.platform()}`;

    reply(msg);
};
