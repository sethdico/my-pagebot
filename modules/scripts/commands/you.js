const axios = require("axios");

module.exports.config = {
    name: "you",
    author: "Sethdico (Ported)",
    version: "1.0",
    category: "AI", // Changed from Utility to AI
    description: "You.com AI Search",
    adminOnly: false,
    usePrefix: false,
    cooldown: 10,
};

module.exports.run = async function ({ event, args }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("🔍 Usage: you <question>", event.sender.id);

    api.sendTypingIndicator(true, event.sender.id);

    try {
        const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/you", {
            params: { chat: query }
        });

        const answer = res.data.response;
        if (answer) {
            api.sendMessage(`🔍 **You.com**\n━━━━━━━━━━━━━━━━\n${answer}`, event.sender.id);
        } else {
            api.sendMessage("❌ No response.", event.sender.id);
        }
    } catch (e) {
        api.sendMessage("❌ You.com is unavailable.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
