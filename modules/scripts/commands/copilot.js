const { http } = require("../../utils");

module.exports.config = {
  name: "copilot",
  author: "Sethdico",
  version: "4.9",
  category: "AI",
  description: "Microsoft Copilot.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
  const input = args.join(" ");
  if (!input) return reply("💠 Usage: copilot <text>");

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

  try {
    const res = await http.get("https://shin-apis.onrender.com/ai/copilot", {
        params: { message: input } 
    });
    const result = res.data.content || res.data.response || res.data.result;
    api.sendMessage(`💠 **COPILOT**\n━━━━━━━━━━━━━━━━\n${result || "Empty response."}`, event.sender.id);
  } catch (e) {
    reply("❌ Copilot is unreachable.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
  }
};
