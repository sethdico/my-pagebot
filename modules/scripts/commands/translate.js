const axios = require("axios");

module.exports.config = {
    name: "translate",
    author: "Sethdico",
    version: "1.0",
    category: "Utility",
    description: "Translate text",
    adminOnly: false,
    usePrefix: false,
    cooldown: 3,
};

module.exports.run = async function ({ event, args }) {
    // 1. CODE LIST
    if (args[0]?.toLowerCase() === "codes" || args[0]?.toLowerCase() === "list") {
        const msg = "🌐 **LANGUAGE CODES**\n━━━━━━━━━━━━━━━━\nen: English\ntl: Tagalog\njp: Japanese\nko: Korean\nfr: French\nes: Spanish\ncn: Chinese\n(And many more standard ISO codes)";
        return api.sendMessage(msg, event.sender.id);
    }

    let targetLang = "en";
    let text = args.join(" ");

    if (!text) return api.sendMessage("⚠️ Usage: translate <lang> <text>", event.sender.id);

    if (args[0].length <= 3 && args.length > 1) {
        targetLang = args[0].toLowerCase();
        text = args.slice(1).join(" ");
    }

    api.sendTypingIndicator(true, event.sender.id);

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await axios.get(url);
        
        const translation = res.data[0].map(x => x[0]).join("");
        const detected = res.data[2];

        const msg = `🌐 **TRANSLATION**\n━━━━━━━━━━━━━━━━\n📥 **[${detected.toUpperCase()}]:**\n${text}\n\n📤 **[${targetLang.toUpperCase()}]:**\n${translation}`;
        api.sendMessage(msg, event.sender.id);

    } catch (e) {
        api.sendMessage("❌ Translation failed.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
