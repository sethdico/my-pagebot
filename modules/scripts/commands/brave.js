const { http, parseAI } = require("../../utils");
const API_URLS = require("../../../config/apis");

module.exports.config = {
    name: "brave", author: "Sethdico", version: "6.1", category: "AI", description: "Brave AI search.", adminOnly: false, usePrefix: false, cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    if (!query) return reply("🦁 Usage: brave <query>");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    try {
        const res = await http.get(API_URLS.brave, { 
            params: { search: query },
            timeout: 60000
        });
        const result = parseAI(res);
        api.sendMessage(`🦁 **BRAVE AI**\n────────────────\n${result || "No response."}`, event.sender.id);
    } catch (e) {
        reply("❌ Brave error.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
