const { http, parseAI } = require("../../utils");

module.exports.config = {
    name: "wolfram",
    author: "Sethdico",
    version: "8.5",
    category: "Utility",
    description: "WolframAlpha.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    const id = event.sender.id;

    if (!input) return reply("🧮 Usage: wolfram <query>");
    
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);

    try {
        const response = await http.get(`https://api.wolframalpha.com/v2/query`, {
            params: {
                appid: process.env.WOLFRAM_APP_ID,
                input: input,
                output: "json",
                format: "plaintext,image",
            }
        });

        const res = response.data.queryresult;

        if (!res.success || res.error) {
            return reply("❌ Wolfram couldn't solve that. Try a clearer query.");
        }

        let fullReport = `🧮 **WOLFRAM ALPHA REPORT**\n━━━━━━━━━━━━━━━━\n`;
        let images = [];

        // 1. Iterate through ALL pods to extract every bit of info
        if (res.pods) {
            res.pods.forEach(pod => {
                const title = pod.title;
                const subpods = pod.subpods || [];
                
                subpods.forEach(sub => {
                    if (sub.plaintext) {
                        fullReport += `📍 **${title}:**\n${sub.plaintext}\n\n`;
                    }
                    // Collect images that represent plots, graphs, or maps
                    if (sub.img?.src && (title.includes("Plot") || title.includes("Graph") || title.includes("Map") || title.includes("Illustration"))) {
                        images.push(sub.img.src);
                    }
                });
            });
        }

        // 2. Send the full text report
        // We limit the length to avoid Facebook's 2000 char limit (sendMessage.js handles splitting, but we keep it clean)
        await api.sendMessage(fullReport.trim(), id);

        // 3. Send all collected graphs as attachments (Max 3 to prevent spam)
        for (const imgUrl of images.slice(0, 3)) {
            await api.sendAttachment("image", imgUrl, id);
        }

        // 4. Setup Flow Buttons for cross-searching
        const buttons = [
            { type: "postback", title: "🔍 Google", payload: `google ${input}` },
            { type: "postback", title: "📚 Wiki", payload: `wiki ${input}` }
        ];

        return api.sendButton("💡 Still need more info?", buttons, id);

    } catch (e) {
        console.error("Wolfram Error:", e.message);
        reply("❌ Wolfram is currently unavailable.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
