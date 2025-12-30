module.exports.config = {
    name: "call", author: "Sethdico", category: "Admin", adminOnly: true, usePrefix: false
};

module.exports.run = async function ({ args, api, reply }) {
    const id = args[0];
    const msg = args.slice(1).join(" ");
    if (!id || !msg) return reply("⚠️ Usage: call [id] [message]");
    try {
        await api.sendMessage(`💬 **MESSAGE FROM OWNER:**\n━━━━━━━━━━━━━━━━\n${msg}`, id);
        reply(`✅ Delivered to ${id}.`);
    } catch (e) { reply("❌ Failed. User blocked the bot."); }
};
