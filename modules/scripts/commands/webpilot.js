const { http, parseAI } = require("../../utils");

module.exports.config = { 
    name: "webpilot", author: "Sethdico", version: "6.0", category: "AI", description: "Search the web.", adminOnly: false, usePrefix: false, cooldown: 5 
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    if (!input) return reply("🌐 Usage: webpilot <query>");

    try {
        const res = await http.get("https://shin-apis.onrender.com/ai/webcopilot", { 
            params: { question: input } 
        });
        const result = parseAI(res);
        api.sendMessage(`🌐 **WEBPILOT**\n━━━━━━━━━━━━━━━━\n${result || "No response."}`, event.sender.id);
    } catch (e) {
        reply("❌ Webpilot search failed.");
    }
};
