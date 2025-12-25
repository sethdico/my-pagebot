const { http } = require("../../utils");
const history = new Map();

module.exports.config = {
  name: "copilot",
  author: "Sethdico",
  version: "4.7-Fast",
  category: "AI",
  description: "Microsoft Copilot.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const input = args.join(" ").trim();

  if (input === "clear") {
    history.delete(senderID);
    return api.sendMessage("🧹 Context cleared.", senderID);
  }

  if (!input) return api.sendMessage("💠 Usage: copilot <text>", senderID);
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    // Get context
    let userHistory = history.get(senderID) || [];
    const context = userHistory.slice(-3).map(h => `Human: ${h.user}\nBot: ${h.bot}`).join("\n");
    const prompt = context ? `Context:\n${context}\n\nHuman: ${input}` : input;

    const res = await http.get("https://shin-apis.onrender.com/ai/copilot", {
        params: { message: prompt }
    });

    const reply = res.data.content || res.data.response;
    if (!reply) throw new Error("No response");

    // Save context
    userHistory.push({ user: input, bot: reply });
    if (userHistory.length > 5) userHistory.shift();
    history.set(senderID, userHistory);

    api.sendMessage(`💠 **Copilot**\n━━━━━━━━━━━━━━━━\n${reply}`, senderID);

  } catch (e) {
    api.sendMessage("❌ Copilot is unreachable.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
