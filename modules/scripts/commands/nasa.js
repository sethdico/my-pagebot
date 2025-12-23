const axios = require("axios");

module.exports.config = {
  name: "nasa",
  author: "Sethdico",
  version: "1.1",
  category: "Fun",
  description: "View the Astronomy Picture of the Day from NASA.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const NASA_API_KEY = "CXbr4ovi6dMLNxbV9XfgBxyskEMbt1Mti7YmXx50"; 
  
  const isRandom = args[0]?.toLowerCase() === "random";
  let apiUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

  if (isRandom) {
    apiUrl += "&count=1";
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const response = await axios.get(apiUrl);
    let data = response.data;

    if (Array.isArray(data)) data = data[0];

    const title = data.title || "NASA Astronomy Picture";
    const date = data.date;
    const explanation = data.explanation || "No description provided.";
    const mediaType = data.media_type; 
    const hdUrl = data.hdurl || data.url;

    let msg = `🌌 **NASA: ${title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n📅 **Date:** ${date}\n📝 **Explanation:** ${explanation.length > 500 ? explanation.substring(0, 500) + "..." : explanation}\n━━━━━━━━━━━━━━━━`;

    if (mediaType === "image") {
      await api.sendAttachment("image", hdUrl, senderID);
    } else if (mediaType === "video") {
      msg += `\n\n🎥 **Video Link:** ${hdUrl}`;
    }

    const buttons = [
      { 
        type: "postback", 
        title: "🎲 Random Date", 
        payload: "nasa random" 
      },
      { 
        type: "web_url", 
        url: hdUrl, 
        title: "🖼️ View High-Res" 
      }
    ];

    await api.sendButton(msg, buttons, senderID);

  } catch (error) {
    console.error("NASA API Error:", error.message);
    api.sendMessage("❌ Error connecting to NASA. Try again later!", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
