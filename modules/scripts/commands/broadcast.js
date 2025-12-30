const { http } = require("../../utils");

module.exports.config = { 
    name: "broadcast", 
    author: "Sethdico",
    version: "2.5",
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
        // Fetch recent conversations
        const res = await http.get(`https://graph.facebook.com/v21.0/me/conversations?fields=participants&limit=100&access_token=${global.PAGE_ACCESS_TOKEN}`);
        
        // Filter out YOUR ID from the list
        const users = res.data.data
            .map(c => c.participants.data[0].id)
            .filter(id => id !== senderID); // <--- THIS PREVENTS SENDING TO YOU

        if (users.length === 0) return reply("ℹ️ No other active users found to broadcast to.");

        reply(`🚀 Starting broadcast to ${users.length} users...`);

        let successCount = 0;
        let failCount = 0;

        for (const id of users) {
            try {
                await api.sendMessage(`📢 **ANNOUNCEMENT**\n\n${msg}`, id);
                successCount++;
                // Small delay to prevent Facebook spam detection
                await new Promise(r => setTimeout(r, 500)); 
            } catch (err) {
                failCount++;
            }
        }

        reply(`✅ **Broadcast Complete**\n━━━━━━━━━━━━━━━━\n● Sent to: ${successCount}\n● Failed: ${failCount}\n● Skipped: You (Admin)`);

    } catch (e) { 
        console.error("Broadcast Error:", e);
        reply("❌ Critical failure during broadcast."); 
    }
};
