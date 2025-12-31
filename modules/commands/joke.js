const { http } = require("../../utils");

module.exports.config = {
  name: "joke", author: "Sethdico", version: "4.0", category: "Fun", description: "Random jokes with flow.", adminOnly: false, usePrefix: false, cooldown: 2,
};

module.exports.run = async ({ event, api }) => {
  try {
    const res = await http.get("https://official-joke-api.appspot.com/random_joke");
    const msg = `🤣 ${res.data.setup}\n\n👉 ${res.data.punchline}`;
    const buttons = [{ type: "postback", title: "🔄 Another One", payload: "joke" }];

    // Flow: Postback "joke" triggers the command again without typing
    api.sendButton(msg, buttons, event.sender.id);
  } catch (e) {
    api.sendMessage("🤣 Why did the bot fail? Because the API was down.", event.sender.id);
  }
};
