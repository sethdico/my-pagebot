const axios = require("axios");

module.exports.config = {
    name: "wolfram",
    aliases: ["wa", "calc", "math"],
    author: "Sethdico",
    version: "2.0-Smart",
    category: "Utility",
    description: "Advanced Computational Knowledge (Math, Science, Facts).",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const input = args.join(" ");
    if (!input) return api.sendMessage("🧮 Usage: wolfram <query>", event.sender.id);

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    // ✅ SECURED: Pulled from Render Environment
    const APP_ID = process.env.WOLFRAM_APP_ID;

    try {
        const url = `http://api.wolframalpha.com/v2/query?appid=${APP_ID}&input=${encodeURIComponent(input)}&output=json`;
        const response = await axios.get(url, { timeout: 20000 });
        const data = response.data.queryresult;

        if (data.success === false) {
            if (data.didyoumeans) {
                const suggestions = data.didyoumeans.map(d => d.val).join("\n• ");
                return api.sendMessage(`❌ Check your spelling.\n🤔 **Did you mean:**\n• ${suggestions}`, event.sender.id);
            }
            return api.sendMessage("❌ Wolfram Alpha couldn't understand that query.", event.sender.id);
        }

        let inputInterp = "Query";
        let resultText = "";
        let resultImage = "";
        let extraInfo = "";

        for (const pod of data.pods) {
            if (pod.title === "Input" || pod.title === "Input interpretation") {
                inputInterp = pod.subpods[0].plaintext;
            }
            if (pod.primary === true || pod.title === "Result" || pod.title === "Decimal approximation" || pod.title === "Exact result") {
                resultText = pod.subpods[0].plaintext;
                if (!resultText) resultImage = pod.subpods[0].img.src;
            }
            if (!resultImage && (pod.title.includes("Plot") || pod.title.includes("Graph"))) {
                resultImage = pod.subpods[0].img.src;
            }
        }

        if (!resultText && !resultImage && data.pods.length > 1) {
            const fallbackPod = data.pods[1];
            resultText = fallbackPod.subpods[0].plaintext;
            resultImage = fallbackPod.subpods[0].img.src;
            extraInfo = `(${fallbackPod.title})`;
        }

        const cleanInput = inputInterp.length > 100 ? inputInterp.substring(0, 100) + "..." : inputInterp;
        const cleanResult = resultText || "Check the image below.";
        const msg = `🧮 **Wolfram Alpha**\n━━━━━━━━━━━━━━━━\n📥 **Input:** ${cleanInput}\n\n📤 **Result:** ${extraInfo}\n${cleanResult}`;
        const webUrl = `https://www.wolframalpha.com/input/?i=${encodeURIComponent(input)}`;
        const buttons = [{ type: "web_url", url: webUrl, title: "🌐 Full Details" }];

        await api.sendButton(msg, buttons, event.sender.id);
        if (resultImage) await api.sendAttachment("image", resultImage, event.sender.id);

    } catch (e) {
        api.sendMessage("❌ Connection timed out or API limit reached.", event.sender.id);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id).catch(()=>{});
    }
};
