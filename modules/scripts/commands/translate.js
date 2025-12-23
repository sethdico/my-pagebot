const axios = require("axios");

// Static Map (O(1))
const LANGUAGES = {
  en: "English", tl: "Tagalog", ja: "Japanese", fr: "French", es: "Spanish",
  de: "German", it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
  ko: "Korean", ar: "Arabic", hi: "Hindi", id: "Indonesian"
};

module.exports.config = {
  name: "translate",
  author: "Sethdico (Optimized)",
  version: "2.1-Fast",
  category: "Utility",
  description: "Auto-detect translation.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  if (!args.length) return api.sendMessage("⚠️ Usage: translate [text]", senderID);

  let targetLang = "en";
  let text = args.join(" ");

  // Check if first arg is a language code (2 letters)
  if (args[0].length === 2 && LANGUAGES[args[0].toLowerCase()]) {
    targetLang = args[0].toLowerCase();
    text = args.slice(1).join(" ");
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(() => {});

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 5000 });

    const translation = res.data[0].map((x) => x[0]).join("");
    const detected = res.data[2] || "auto";

    const msg = `🌐 **TRANSLATE** (${detected.toUpperCase()} ➝ ${targetLang.toUpperCase()})\n━━━━━━━━━━━━━━━━\n${translation}`;
    
    // Audio link (Google TTS)
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(translation)}&tl=${targetLang}&client=tw-ob`;
    
    // Try to send audio + text
    await api.sendMessage(msg, senderID);
    api.sendAttachment("audio", audioUrl, senderID).catch(() => {}); // Optional audio

  } catch (e) {
    api.sendMessage("❌ Translation timed out.", senderID);
  }
};
