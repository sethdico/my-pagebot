const { http, parseAI } = require("../../utils");

module.exports.config = {
  name: "aria",
  author: "Sethdico",
  version: "6.0",
  category: "AI",
  description: "Aria AI with memory.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
  const input = args.join(" ");
  if (!input) return reply("🤖 Usage: aria <text>");
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

  try {
    const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
      params: { ask: input, userid: event.sender.id }
    });
    const result = parseAI(res);
    api.sendMessage(`🤖 **ARIA**\n━━━━━━━━━━━━━━━━\n${result || "No response."}`, event.sender.id);
  } catch (e) {
    reply("❌ Aria is currently napping.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
  }
};
