const { http } = require("../../utils");

module.exports.config = { 
    name: "venice", 
    author: "Sethdico",
    version: "1.2",
    category: "AI", 
    description: "Venice AI assistant",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5 
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    if (!input) return reply("🎭 Usage: venice <text>");

    try {
        const res = await http.get("https://shin-apis.onrender.com/ai/venice", { 
            params: { question: input } 
        });
        
        // FIXED: prioritized res.data.answer
        const result = res.data.answer || res.data.response || res.data.result;
        
        api.sendMessage(`🎭 **VENICE**\n━━━━━━━━━━━━━━━━\n${result}`, event.sender.id);
    } catch (e) {
        reply("❌ Venice is silent.");
    }
};
