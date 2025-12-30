const { http, parseAI } = require("../../utils");

module.exports.config = {
    name: "wolfram",
    author: "Sethdico",
    version: "7.0",
    category: "Utility",
    description: "Solve math/science with graphs and cross-search.",
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

        let interpretation = "";
        let primaryResult = "";
        let graphUrl = "";

        // 1. Deep Pod Extraction
        if (res.pods) {
            for (const pod of res.pods) {
                const title = pod.title;
                const text = pod.subpods[0]?.plaintext;
                const img = pod.subpods[0]?.img?.src;

                // Grab the input interpretation
                if (title === "Input interpretation" || title === "Input") {
                    interpretation = text;
                }
                // Grab the main answer
                else if (pod.primary || title === "Result" || title === "Decimal approximation") {
                    primaryResult = text;
                }
                // Grab the best graph/plot if we don't have one yet
                if (!graphUrl && (title.includes("Plot") || title.includes("Graph"))) {
                    graphUrl = img;
                }
            }
        }

        // 2. Build the Message
        let msg = `🧮 **WOLFRAM ALPHA**\n━━━━━━━━━━━━━━━━\n`;
        msg += `📥 **Q:** ${interpretation || input}\n\n`;
        msg += `📤 **A:**\n${primaryResult || "See graph/details below."}`;

        // 3. Setup Flow Buttons
        const buttons = [
            { type: "postback", title: "🔍 Google", payload: `google ${input}` },
            { type: "postback", title: "📚 Wiki", payload: `wiki ${input}` }
        ];

        // 4. Send Graph if available
        if (graphUrl) {
            await api.sendAttachment("image", graphUrl, id);
        }

        // 5. Send Main Message with Buttons
        return api.sendButton(msg, buttons, id);

    } catch (e) {
        console.error("Wolfram Error:", e.message);
        reply("❌ Wolfram is currently unavailable.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
