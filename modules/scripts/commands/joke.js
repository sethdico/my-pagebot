const axios = require("axios")
const api = require("path-to-api-module") // Declare the api variable

module.exports.config = {
  name: "joke",
  author: "Sethdico",
  version: "2.0",
  category: "Fun",
  description: "Get random jokes from multiple categories (dad, programming, dark, pun, misc).",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
}

module.exports.run = async ({ event, args }) => {
  const senderID = event.sender.id

  const category = args[0]?.toLowerCase()
  const validCategories = ["dad", "programming", "dark", "pun", "misc"]

  if (category === "list") {
    return api.sendMessage(
      `😂 **Available Categories:**\n\n• dad - Dad jokes\n• programming - Tech jokes\n• dark - Dark humor\n• pun - Puns\n• misc - Random jokes\n\nUsage: joke <category>`,
      senderID,
    )
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID)

  try {
    let jokeText = ""
    let jokeEmoji = "🤣"

    if (category === "dad") {
      const res = await axios.get("https://icanhazdadjoke.com/", {
        headers: { Accept: "application/json" },
      })
      jokeText = res.data.joke
      jokeEmoji = "👨"
    } else if (category === "programming") {
      const res = await axios.get("https://official-joke-api.appspot.com/jokes/programming/random")
      const joke = res.data[0]
      await api.sendMessage(`💻 **Programming Joke**\n\n${joke.setup}`, senderID)
      setTimeout(async () => {
        await api.sendMessage(`👉 ${joke.punchline}`, senderID)
      }, 3000)
      return
    } else {
      // Default: 2-part joke
      const res = await axios.get("https://official-joke-api.appspot.com/random_joke")
      const { setup, punchline } = res.data

      await api.sendMessage(`${jokeEmoji} **Joke Time!**\n\n${setup}`, senderID)
      setTimeout(async () => {
        await api.sendMessage(`👉 ${punchline}`, senderID)
      }, 3000)
      return
    }

    // For single-line jokes (dad jokes)
    if (jokeText) {
      await api.sendMessage(`${jokeEmoji} **Joke Time!**\n\n${jokeText}`, senderID)
    }
  } catch (e) {
    console.error("Joke API Error:", e.message)
    api.sendMessage("❌ Couldn't fetch a joke right now. Try: joke list", senderID)
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID)
  }
}
