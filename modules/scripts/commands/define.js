const axios = require("axios");

module.exports.config = {
  name: "define",
  author: "Sethdico (Ported)",
  version: "1.0",
  category: "Utility",
  description: "Define a word",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async function ({ event, args }) {
  const word = args[0];
  if (!word) return api.sendMessage("📖 Usage: define <word>", event.sender.id);

  try {
    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = res.data[0];
    
    let msg = `📖 **${data.word}**\n`;
    if (data.phonetic) msg += `🗣️ ${data.phonetic}\n`;
    
    data.meanings.forEach(m => {
        msg += `\n🔹 *${m.partOfSpeech}*\n${m.definitions[0].definition}`;
    });

    api.sendMessage(msg, event.sender.id);
    
    // Audio if available
    const audio = data.phonetics.find(p => p.audio)?.audio;
    if (audio) api.sendAttachment("audio", audio, event.sender.id);

  } catch (e) {
    api.sendMessage(`❌ Definition not found for "${word}".`, event.sender.id);
  }
};
