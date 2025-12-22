const axios = require("axios")
const aiUtils = require("./ai-utils")
const api = require("./api") // Declare the api variable

module.exports.config = {
  name: "copilot",
  author: "Sethdico",
  version: "2.0",
  category: "AI",
  description: "Microsoft Copilot with 3 modes: default, think-deeper, gpt-5. Supports vision and memory.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
}

module.exports.run = async ({ event, args }) => {
  const senderID = event.sender.id

  if (args[0]?.toLowerCase() === "clear") {
    aiUtils.clearSession(senderID, "copilot")
    return api.sendMessage("🧹 Copilot conversation cleared!", senderID)
  }

  if (args.length === 0) {
    return api.sendMessage(
      "⚠️ **Usage:**\ncopilot <message> - Default mode\ncopilot think-deeper <message> - Deep reasoning\ncopilot gpt-5 <message> - GPT-5 mode\ncopilot clear - Reset conversation",
      senderID,
    )
  }

  const validModels = ["default", "think-deeper", "gpt-5"]
  let model = "default"
  let message = args.join(" ")

  if (validModels.includes(args[0].toLowerCase()) && args.length > 1) {
    model = args[0].toLowerCase()
    message = args.slice(1).join(" ")
  }

  let imageUrl = ""
  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url
  }

  api.sendTypingIndicator(true, senderID)

  try {
    const session = aiUtils.getOrCreateSession(senderID, `copilot_${model}`)
    session.messages.push({ role: "user", content: message })

    const apiUrl = "https://shin-apis.onrender.com/ai/copilot"
    const params = { message: message, model: model }
    if (imageUrl) params.imageurl = imageUrl

    const response = await axios.get(apiUrl, {
      params: params,
      timeout: 90000, // Increased timeout for think-deeper mode
    })

    const reply = response.data.result || response.data.response || response.data.answer || response.data.message

    if (reply) {
      session.messages.push({ role: "assistant", content: reply })
      aiUtils.updateSession(senderID, `copilot_${model}`, session)

      const urls = aiUtils.extractUrls(reply)
      if (urls.length > 0) {
        await api.sendMessage(`🔗 Found ${urls.length} link(s) in response`, senderID)
      }

      await aiUtils.formatAIResponse(reply, senderID, api, `💡 Copilot [${model}]`)
    } else {
      api.sendMessage("❌ No response from Copilot.", senderID)
    }
  } catch (e) {
    console.error("Copilot Error:", e.message)
    await aiUtils.handleAPIError(e, senderID, api, "Copilot")
  } finally {
    api.sendTypingIndicator(false, senderID)
  }
}
