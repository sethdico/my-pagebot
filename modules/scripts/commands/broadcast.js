const db = require("../../database");

module.exports.config = { 
    name: "broadcast", 
    author: "Sethdico",
    version: "3.0",
    category: "Admin",
    description: "Send announcement to all users.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 10 
};

module.exports.run = async ({ event, args, api, reply }) => {
    const msg = args.join(" ");
    const senderID = event.sender.id;

    if (!msg) return reply("📢 Usage: broadcast <message>");

    try {
        const users = await db.getAllUsers();
        const recipients = users.filter(u => u.userId !== senderID).map(u => u.userId);

        if (recipients.length === 0) return reply("ℹ️ no active users to broadcast to");

        reply(`🚀 broadcasting to ${recipients.length} users...`);

        let success = 0, failed = 0;
        const errors = [];

        for (const id of recipients) {
            try {
                await api.sendMessage(`📢 **ANNOUNCEMENT**\n\n${msg}`, id);
                success++;
                await new Promise(r => setTimeout(r, 500)); // Rate limit
            } catch (err) {
                failed++;
                if (errors.length < 5) errors.push(`${id}: ${err.message}`);
            }
        }

        let report = `✅ **Broadcast Complete**\n────────────────\n✓ Sent: ${success}\n✗ Failed: ${failed}`;
        if (errors.length > 0) report += `\n\nErrors:\n${errors.join("\n")}`;
        
        reply(report);

    } catch (e) { 
        reply("❌ broadcast failed"); 
    }
};
