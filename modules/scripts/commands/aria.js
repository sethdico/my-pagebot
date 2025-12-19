const axios = require("axios");

module.exports.config = {
    name: "aria",
    author: "Sethdico (Ported)",
    version: "1.0",
    category: "AI",
    description: "Aria AI",
    adminOnly: false,
    usePrefix: false,
    cooldown: 8,
};

module.exports.run = async function ({ event, args }) {
    const query = args.join(" ").trim();
    if (!query) return api.sendMessage("🤖 Usage: aria <question>", event.sender.id);

    api.sendTypingIndicator(true, event.sender.id);

    try {
        const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
            params: { ask: query, userid: event.sender.id }
        });

        const answer = res.data.response || res.data.message || res.data.result;
        if (answer) {
            const msg = `🤖 **Aria AI**\n━━━━━━━━━━━━━━━━\n${answer}`;
            api.sendMessage(msg, event.sender.id);
        } else {
            api.sendMessage("❌ Aria returned empty response.", event.sender.id);
        }
    } catch (e) {
        api.sendMessage("❌ Aria is offline.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
