const { http, parseAI } = require("../../utils");
const API_URLS = require("../../../config/apis");

module.exports.config = {
    name: "quillbot",
    author: "Sethdico",
    version: "6.1",
    category: "AI",
    description: "Quillbot Ai.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    if (!input) return reply("✍️ Usage: quillbot <text>");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    try {
        const res = await http.get(API_URLS.quillbot, {
             params: { prompt: input },
             timeout: 60000
        });

        let content = parseAI(res) || "";
        
        // Handle SSE "output_done" format if present
        if (content.includes("output_done")) {
            const match = content.match(/"text":"(.*?)"/);
            if (match) content = match[1].replace(/\\n/g, '\n');
        }

        api.sendMessage(`✍️ **QUILLBOT**\n────────────────\n${content || "No response."}`, event.sender.id);
    } catch (error) {
        reply("❌ Quillbot error.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
