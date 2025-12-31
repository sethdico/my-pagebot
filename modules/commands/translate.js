const { http } = require("../../utils");

const LANGS = {
  en: "english", tl: "tagalog", ja: "japanese", fr: "french", 
  es: "spanish", ko: "korean", ar: "arabic", zh: "chinese",
  de: "german", it: "italian", ru: "russian", pt: "portuguese"
};

module.exports.config = {
  name: "translate",
  author: "Sethdico",
  version: "3.0",
  category: "Utility",
  description: "translate text",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api }) => {
  const id = event.sender.id;
  if (!args.length) return api.sendMessage("usage: translate [lang] [text]\nexample: translate tl hello", id);

  let targetLang = "en";
  let text = args.join(" ");

  // check if first arg is language code
  if (args[0].length === 2 && LANGS[args[0].toLowerCase()]) {
    targetLang = args[0].toLowerCase();
    text = args.slice(1).join(" ");
  }

  if (!text) return api.sendMessage("add some text to translate", id);
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, id).catch(()=>{});

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await http.get(url);

    const translated = res.data[0].map(x => x[0]).join("");
    const detected = res.data[2] || "auto";

    await api.sendMessage(`${detected} → ${targetLang}\n\n${translated}`, id);

    // send audio pronunciation
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(translated)}&tl=${targetLang}&client=tw-ob`;
    api.sendAttachment("audio", audioUrl, id).catch(()=>{});

  } catch (e) {
    api.sendMessage("translation failed", id);
  }
};
