const { http } = require("../../utils");
module.exports.config = { name: "venice", category: "AI", cooldown: 5 };
module.exports.run = async ({ event, args, api }) => {
    if (!args[0]) return api.sendMessage("🎭 Usage: venice <text>", event.sender.id);
    try {
        const res = await http.get("https://shin-apis.onrender.com/ai/venice", { 
            params: { question: args.join(" "), _: Date.now() } 
        });
        api.sendMessage(`🎭 **Venice**\n${res.data.response}`, event.sender.id);
    } catch (e) { api.sendMessage("❌ Venice is silent.", event.sender.id); }
};
