const db = require("../../database");

module.exports.config = {
    name: "maintenance", author: "Sethdico", version: "2.7", category: "Admin", description: "Toggle bot availability.", adminOnly: true, usePrefix: false, cooldown: 0,
};

module.exports.run = async function ({ args, reply }) {
    const action = args[0]?.toLowerCase();
    const reason = args.slice(1).join(" ") || "bot's getting updated rn, back soon";

    if (action === "on") {
        global.MAINTENANCE_MODE = true;
        global.MAINTENANCE_REASON = reason;
        await db.setSetting("maintenance", "true");
        await db.setSetting("maintenance_reason", reason);
        return reply(`⚠️ **Maintenance Mode: ON**\n📝 Reason: ${reason}`);
    } 
    
    if (action === "off") {
        global.MAINTENANCE_MODE = false;
        await db.setSetting("maintenance", "false");
        return reply("✅ **Maintenance Mode: OFF**");
    }

    reply(`🛠️ Status: ${global.MAINTENANCE_MODE ? "ON" : "OFF"}\nReason: ${global.MAINTENANCE_REASON}`);
};
