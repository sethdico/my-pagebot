const axios = require("axios");

module.exports.config = {
    name: "wolfram",
    aliases: ["wa", "calc", "math"],
    author: "Sethdico (Ultra-Optimized)",
    version: "4.0",
    category: "Utility",
    description: "Deep-search computational knowledge. Extracts all available data pods.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const input = args.join(" ");
    const senderID = event.sender.id;

    if (!input) return api.sendMessage("🧮 Usage: wolfram <query>", senderID);
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(() => {});

    const APP_ID = process.env.WOLFRAM_APP_ID;

    try {
        const url = `http://api.wolframalpha.com/v2/query?appid=${APP_ID}&input=${encodeURIComponent(input)}&output=json`;
        const { data } = await axios.get(url, { timeout: 30000 });
        const res = data.queryresult;

        // 1. HANDLE FAILURE / SUGGESTIONS
        if (!res.success) {
            let errorMsg = "❌ Wolfram Alpha couldn't find a direct answer.";
            if (res.didyoumeans) {
                const suggestions = Array.isArray(res.didyoumeans) ? res.didyoumeans : [res.didyoumeans];
                errorMsg += `\n\n🤔 **Did you mean:**\n• ${suggestions.slice(0, 3).map(s => s.val).join("\n• ")}`;
            }
            return api.sendMessage(errorMsg, senderID);
        }

        // 2. EXTRACTION LOGIC
        let interpretation = "";
        let primaryResult = "";
        let extendedData = [];
        let images = [];

        for (const pod of res.pods) {
            const title = pod.title;
            const text = pod.subpods[0]?.plaintext;
            const imgSrc = pod.subpods[0]?.img?.src;

            // Save Plots/Graphs
            if (imgSrc && (title.includes("Plot") || title.includes("Graph") || title.includes("Map") || title.includes("Illustration"))) {
                images.push(imgSrc);
            }

            if (!text) continue;

            // Categorize text data
            if (title === "Input interpretation" || title === "Input") {
                interpretation = text;
            } else if (pod.primary || ["Result", "Decimal approximation", "Solution", "Value"].includes(title)) {
                primaryResult = text;
            } else {
                // Add everything else to extended data
                extendedData.push(`📍 **${title}**\n${text}`);
            }
        }

        // 3. BUILD THE MESSAGE (Optimized for FB 2000-char limit)
        let header = `🧮 **WOLFRAM KNOWLEDGE**\n━━━━━━━━━━━━━━━━\n`;
        let body = `📥 **Query:** ${interpretation || input}\n\n`;
        body += `📤 **Primary Answer:**\n${primaryResult || "See details below."}\n\n`;

        if (extendedData.length > 0) {
            body += `━━━━━━━━━━━━━━━━\n${extendedData.join("\n\n")}`;
        }

        // Truncate to avoid Facebook crash (Safe limit: 1900 chars)
        if (body.length > 1800) body = body.substring(0, 1797) + "...";

        const finalMsg = header + body;
        const buttons = [{ type: "web_url", url: `https://www.wolframalpha.com/input/?i=${encodeURIComponent(input)}`, title: "🌐 View Full Source" }];

        // 4. SEND RESPONSE
        await api.sendButton(finalMsg, buttons, senderID);

        // Send top 2 images (Primary result + Plot)
        if (images.length > 0) {
            for (const img of images.slice(0, 2)) {
                await api.sendAttachment("image", img, senderID);
            }
        }

    } catch (e) {
        console.error("Wolfram Error:", e.message);
        api.sendMessage("❌ Connection timed out. Try a simpler query.", senderID);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(() => {});
    }
};
