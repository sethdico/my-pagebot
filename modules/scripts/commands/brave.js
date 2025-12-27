const { http, parseAI } = require("../../utils");

module.exports.config = {
    name: "brave", author: "Sethdico", version: "6.0", category: "AI", description: "Brave AI search.", adminOnly: false, usePrefix: false, cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    if (!query) return reply("🦁 Usage: brave <query>");

    try {
        const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/brave", { 
            params: { search: query } 
        });
        const result = parseAI(res);
        api.sendMessage(`🦁 **BRAVE AI**\n━━━━━━━━━━━━━━━━\n${result || "No response."}`, event.sender.id);
    } catch (e) {
        reply("❌ Brave error.");
    }
};
