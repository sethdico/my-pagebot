const axios = require("axios");

module.exports.config = {
  name: "translate",
  aliases: ["trans", "tr"], // You can add aliases in handler.js if needed, or just use name
  author: "Sethdico (Ported)",
  version: "1.0",
  category: "Utility",
  description: "Translate text",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async function ({ event, args }) {
    let targetLang = "en"; 
    let text = args.join(" ");

    if (!text) return api.sendMessage("🌐 Usage: translate <lang> <text>\nExample: translate es Hello", event.sender.id);

    // Check if first word is a language code (2 letters)
    if (args[0].length === 2) {
        targetLang = args[0];
        text = args.slice(1).join(" ");
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await axios.get(url);
        const translation = res.data[0].map(x => x[0]).join("");
        const detected = res.data[2];

        const msg = `🌐 **Translate (${detected.toUpperCase()} -> ${targetLang.toUpperCase()})**\n━━━━━━━━━━━━━━━━\n${translation}`;
        api.sendMessage(msg, event.sender.id);

    } catch (e) {
        api.sendMessage("❌ Translation failed.", event.sender.id);
    }
};
