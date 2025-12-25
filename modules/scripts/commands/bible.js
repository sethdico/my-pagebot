const { http } = require("../../utils");

module.exports.config = {
    name: "bible",
    author: "Sethdico",
    version: "1.1-Fast",
    category: "Fun",
    description: "Random Verse.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, api }) {
  try {
    const res = await http.get("https://urangkapolka.vercel.app/api/bible");
    const { verse, reference } = res.data;
    
    const msg = `✝️ **${reference || "Bible"}**\n━━━━━━━━━━━━━━━━\n${verse || res.data.text}`;
    const buttons = [{ type: "postback", title: "📖 New Verse", payload: "bible" }];

    api.sendButton(msg, buttons, event.sender.id);
  } catch (e) {
    api.sendMessage("❌ Amen... but the API is down.", event.sender.id);
  }
};
