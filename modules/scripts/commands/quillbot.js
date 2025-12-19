const axios = require("axios");

module.exports.config = {
  name: "quillbot",
  author: "Sethdico (Ported)",
  version: "1.0",
  category: "AI",
  description: "Paraphrase text",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  const text = args.join(" ");
  if (!text) return api.sendMessage("✍️ Usage: quillbot <text to rewrite>", event.sender.id);

  try {
      const response = await axios.get("https://api.ccprojectsapis-jonell.gleeze.com/api/ai/quillbotai", {
          params: { prompt: text }
      });
      
      const reply = response.data.result || response.data.message;
      if (reply) {
          api.sendMessage(`✍️ **Rewritten:**\n\n${reply}`, event.sender.id);
      } else {
          api.sendMessage("❌ Could not paraphrase.", event.sender.id);
      }
  } catch (error) {
      api.sendMessage("❌ Error contacting Quillbot.", event.sender.id);
  }
};
