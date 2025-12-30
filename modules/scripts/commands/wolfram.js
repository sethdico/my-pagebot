const { http, parseAI } = require("../../utils");

module.exports.config = {
    name: "wolfram", author: "Sethdico", version: "6.0", category: "Utility", description: "Wolfram with Lite buttons.", adminOnly: false, usePrefix: false, cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    if (!input) return reply("🧮 Usage: wolfram <query>");

    try {
        const response = await http.get(`https://api.wolframalpha.com/v2/query`, {
            params: { appid: process.env.WOLFRAM_APP_ID, input: input, output: "json" }
        });

        const result = parseAI(response);
        const msg = `🧮 **RESULT:**\n${result || "Check details."}`;
        
        const buttons = [
            { type: "postback", title: "🔍 Google", payload: `google ${input}` },
            { type: "postback", title: "📚 Wiki", payload: `wiki ${input}` }
        ];

        return api.sendButton(msg, buttons, event.sender.id);
    } catch (e) {
        reply("❌ Wolfram unavailable.");
    }
};
