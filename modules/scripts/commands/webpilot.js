const { http } = require("../../utils");

module.exports.config = { 
    name: "webpilot", 
    category: "AI", 
    cooldown: 5 
};

module.exports.run = async ({ event, args, api, reply }) => {
    const query = args.join(" ");
    if (!query) return reply("🌐 Usage: webpilot <search>");
    
    try {
        const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/webpilot", { 
            params: { search: query } 
        });

        const result = res.data.response || res.data.result || res.data.message || res.data.content;

        if (!result) throw new Error("Empty Response");

        api.sendMessage(`🌐 **WEBPILOT**\n━━━━━━━━━━━━━━━━\n${result}`, event.sender.id);
    } catch (e) { 
        reply("❌ Webpilot error."); 
    }
};
