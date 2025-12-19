const axios = require("axios");

module.exports.config = {
    name: "bible",
    author: "Sethdico (Ported)",
    version: "1.0",
    category: "Fun",
    description: "Random Bible Verse",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event }) {
  try {
    const res = await axios.get("https://urangkapolka.vercel.app/api/bible");
    const data = res.data;
    const verse = data.verse || data.text || data.content;
    const ref = data.reference || data.ref || "Holy Bible";

    api.sendMessage(`✝️ **${ref}**\n\n${verse}`, event.sender.id);
  } catch (e) {
    api.sendMessage("❌ Could not get a verse.", event.sender.id);
  }
};
