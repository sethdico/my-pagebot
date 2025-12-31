const { http } = require("../utils");
const API_URLS = require("../../../config/apis");

module.exports.config = { 
    name: "you", author: "Sethdico", category: "AI", version: "1.1", description: "You.com Search.", adminOnly: false, usePrefix: false, cooldown: 5 
};

module.exports.run = async ({ event, args, api, reply }) => {
    if (!args[0]) return reply("🔍 Usage: you <question>");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    try {
        const res = await http.get(API_URLS.you, { 
            params: { chat: args.join(" ") },
            timeout: 60000
        });
        api.sendMessage(`🔍 **You.com**\n────────────────\n${res.data.message || res.data.response || "No response."}`, event.sender.id);
    } catch (e) { 
        reply("❌ You.com is down."); 
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
