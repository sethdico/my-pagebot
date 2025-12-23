const axios = require("axios");

module.exports.config = {
    name: "youai",
    author: "Sethdico",
    version: "1.5-Lite",
    category: "AI",
    description: "You.com Search AI.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("🔍 Usage: you <question>", event.sender.id);

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    try {
        const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/you", {
            params: { chat: query },
            timeout: 30000
        });

        const answer = res.data.response || res.data.message;
        
        if (answer) {
            api.sendMessage(`🔍 **You.com**\n━━━━━━━━━━━━━━━━\n${answer}`, event.sender.id);
        } else {
            api.sendMessage("❌ You.com found nothing.", event.sender.id);
        }
    } catch (e) {
        api.sendMessage("❌ You.com is unreachable.", event.sender.id);
    }
};
