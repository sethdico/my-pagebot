const { http } = require("../../utils");
const history = new Map();

module.exports.config = {
  name: "aria",
  author: "Sethdico",
  version: "5.3",
  category: "AI",
  description: "Aria AI.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const senderID = event.sender.id;
  const input = args.join(" ").trim();

  if (input.toLowerCase() === "clear") {
    history.delete(senderID);
    return reply("🧹 Aria's memory wiped.");
  }

  if (!input) return reply("🤖 Usage: aria <message>");
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    let userHistory = history.get(senderID) || [];
    const context = userHistory.slice(-3).map(h => `User: ${h.user}\nBot: ${h.bot}`).join("\n");
    const prompt = context ? `${context}\nUser: ${input}` : input;

    const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
      params: { ask: prompt, userid: senderID }
    });

    // The Parser: Checks every key including 'result' which Aria often uses
    const answer = res.data.response || res.data.result || res.data.message || res.data.content || res.data.data?.answer;

    if (!answer) throw new Error("Blank Response");

    userHistory.push({ user: input, bot: answer });
    if (userHistory.length > 5) userHistory.shift();
    history.set(senderID, userHistory);

    api.sendMessage(`🤖 **ARIA**\n━━━━━━━━━━━━━━━━\n${answer}`, senderID);
  } catch (e) {
    reply("❌ Aria is currently napping.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
