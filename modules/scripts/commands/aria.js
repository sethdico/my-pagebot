const axios = require("axios");
const aiUtils = require("./ai-utils");

module.exports.config = {
  name: "aria",
  author: "Sethdico",
  version: "3.0-Fixed",
  category: "AI",
  description: "Aria AI with conversation memory. Use 'aria clear' to reset.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const query = args.join(" ").trim();
  const senderID = event.sender.id;

  if (query.toLowerCase() === "clear") {
    aiUtils.clearSession(senderID, "aria");
    return api.sendMessage("🧹 Aria conversation cleared!", senderID);
  }

  if (!query) {
    return api.sendMessage(
      "🤖 Usage: aria <question>\n\nTip: I remember our conversation! Use 'aria clear' to reset.",
      senderID
    );
  }

  api.sendTypingIndicator(true, senderID);

  try {
    const session = aiUtils.getOrCreateSession(senderID, "aria");
    session.messages.push({ role: "user", content: query });

    const result = await aiUtils.safeApiCall(
      "https://betadash-api-swordslush-production.up.railway.app/Aria",
      { ask: query, userid: senderID },
      60000
    );

    if (!result.success) {
      throw new Error(result.error);
    }

    const answer = aiUtils.extractResponse(result.data);

    if (answer) {
      session.messages.push({ role: "assistant", content: answer });
      aiUtils.updateSession(senderID, "aria", session);
      
      await aiUtils.formatAIResponse(answer, senderID, api, "🤖 Aria AI");
    } else {
      api.sendMessage("❌ Aria returned empty response.", senderID);
    }
  } catch (e) {
    console.error("Aria Error:", e.message);
    await aiUtils.handleAPIError(e, senderID, api, "Aria");
  } finally {
    api.sendTypingIndicator(false, senderID);
  }
};
