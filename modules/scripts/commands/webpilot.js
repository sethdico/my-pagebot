const axios = require("axios");

module.exports.config = {
    name: "webpilot",
    author: "Sethdico (Ported)",
    version: "1.0",
    category: "Utility",
    description: "Web Search AI",
    adminOnly: false,
    usePrefix: false,
    cooldown: 10,
};

module.exports.run = async function ({ event, args }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("🌐 Usage: webpilot <search query>", event.sender.id);

    api.sendTypingIndicator(true, event.sender.id);
    api.sendMessage(`🌐 Searching: "${query}"...`, event.sender.id);

    try {
        const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/webpilot", {
            params: { search: query }
        });

        const answer = res.data.response;
        if (answer) {
            api.sendMessage(`🌐 **WebPilot**\n━━━━━━━━━━━━━━━━\n${answer}`, event.sender.id);
        } else {
            api.sendMessage("❌ No results found.", event.sender.id);
        }
    } catch (e) {
        api.sendMessage("❌ WebPilot is down.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
