const { http } = require("../../utils");

module.exports.config = { 
    name: "venice", 
    category: "AI", 
    cooldown: 5 
};

module.exports.run = async ({ event, args, api, reply }) => {
    const prompt = args.join(" ");
    if (!prompt) return reply("🎭 Usage: venice <text>");
    
    try {
        const res = await http.get("https://shin-apis.onrender.com/ai/venice", { 
            params: { question: prompt, _: Date.now() } 
        });

        const result = res.data.response || res.data.result || res.data.message || res.data.content;

        if (!result) throw new Error("Empty Response");

        api.sendMessage(`🎭 **VENICE**\n━━━━━━━━━━━━━━━━\n${result}`, event.sender.id);
    } catch (e) { 
        reply("❌ Venice is silent."); 
    }
};
