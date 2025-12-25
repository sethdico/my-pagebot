const axios = require("axios");

module.exports.config = {
    name: "broadcast",
    author: "Sethdico",
    version: "3.3",
    category: "Admin",
    description: "send global announcement.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    if (!global.ADMINS.has(senderID)) return reply("⛔ admin only.");

    const msg = args.join(" ");
    if (!msg) return reply("📢 usage: broadcast <message>");

    try {
        const res = await axios.get(`https://graph.facebook.com/v21.0/me/conversations?fields=participants&limit=100&access_token=${global.PAGE_ACCESS_TOKEN}`);
        const users = res.data.data.map(c => c.participants.data[0].id);

        users.forEach(id => {
            api.sendMessage(`📢 **announcement**\n\n${msg}`, id).catch(() => {});
        });

        reply(`✅ sent to ${users.length} users.`);
    } catch (e) {
        reply("❌ failed.");
    }
};
