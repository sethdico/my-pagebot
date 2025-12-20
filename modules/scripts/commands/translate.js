const axios = require("axios");

module.exports.config = {
    name: "translate",
    author: "Sethdico",
    version: "1.2",
    category: "Utility",
    description: "Translate text with voice support.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 3,
};

module.exports.run = async function ({ event, args }) {
    if (args[0]?.toLowerCase() === "codes" || args[0]?.toLowerCase() === "list") {
        const msg = "🌐 **LANGUAGE CODES**\nen: English\ntl: Tagalog\njp: Japanese\nfr: French\nes: Spanish";
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

        // Create a Google TTS Link for the button
        const audioLink = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(translation)}&tl=${targetLang}&client=tw-ob`;

        const buttons = [
            {
                type: "web_url",
                url: audioLink,
                title: "🔊 Listen"
            }
        ];

        const msg = `🌐 **TRANSLATION**\n━━━━━━━━━━━━━━━━\n📥 [${detected.toUpperCase()}]: ${text}\n📤 [${targetLang.toUpperCase()}]: ${translation}`;
        
        await api.sendButton(msg, buttons, event.sender.id);

    } catch (e) {
        api.sendMessage("❌ Translation failed.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
