const axios = require("axios")
const aiUtils = require("./ai-utils")
const api = require("./api") // Declare the api variable

module.exports.config = {
  name: "aria",
  author: "Sethdico",
  version: "2.0",
  category: "AI",
  description: "Aria AI with conversation memory. Use 'aria clear' to reset.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
}

module.exports.run = async ({ event, args }) => {
  const query = args.join(" ").trim()
  const senderID = event.sender.id

  if (query.toLowerCase() === "clear") {
    aiUtils.clearSession(senderID, "aria")
    return api.sendMessage("🧹 Aria conversation cleared!", senderID)
  }

  if (!query)
    return api.sendMessage(
      "🤖 Usage: aria <question>\n\nTip: I remember our conversation! Use 'aria clear' to reset.",
      senderID,
    )

  api.sendTypingIndicator(true, senderID)

  try {
    const session = aiUtils.getOrCreateSession(senderID, "aria")
    session.messages.push({ role: "user", content: query })

    const res = await axios.get("https://betadash-api-swordslush-production.up.railway.app/Aria", {
      params: { ask: query, userid: senderID },
      timeout: 60000,
    })

    const answer = res.data.response || res.data.message || res.data.result

    if (answer) {
      session.messages.push({ role: "assistant", content: answer })
      aiUtils.updateSession(senderID, "aria", session)

      await aiUtils.formatAIResponse(answer, senderID, api, "🤖 Aria AI")
    } else {
      api.sendMessage("❌ Aria returned empty response.", senderID)
    }
  } catch (e) {
    console.error("Aria Error:", e.message)
    await aiUtils.handleAPIError(e, senderID, api, "Aria")
  } finally {
    api.sendTypingIndicator(false, senderID)
  }
}
