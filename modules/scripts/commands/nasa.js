const axios = require("axios");
module.exports.config = {
  name: "nasa",
  author: "Sethdico",
  version: "2.0",
  category: "Fun",
  description: "View NASA's Astronomy Picture of the Day, search by date, or get random images.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};
module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const NASA_API_KEY = "CXbr4ovi6dMLNxbV9XfgBxyskEMbt1Mti7YmXx50";
const isRandom = args[0]?.toLowerCase() === "random";
  const isDateSearch = args[0] && /^\d{4}-\d{2}-\d{2}$/.test(args[0]);

  let apiUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
if (isRandom) {
    apiUrl += "&count=1";
  } else if (isDateSearch) {
    apiUrl += `&date=${args[0]}`;
}

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const response = await axios.get(apiUrl, { timeout: 15000 });
let data = response.data;

    if (Array.isArray(data)) data = data[0];

    const title = data.title || "NASA Astronomy Picture";
const date = data.date;
    const explanation = data.explanation || "No description provided.";
    const mediaType = data.media_type;
const hdUrl = data.hdurl || data.url;
    const copyright = data.copyright ? `\n📸 **Copyright:** ${data.copyright}` : "";
let msg = `🌌 **NASA: ${title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n📅 **Date:** ${date}${copyright}\n📝 **Explanation:** ${explanation.length > 500 ? explanation.substring(0, 500) + "..." : explanation}\n━━━━━━━━━━━━━━━━`;
if (mediaType === "image") {
      await api.sendAttachment("image", hdUrl, senderID);
} else if (mediaType === "video") {
      msg += `\n\n🎥 **Video Link:** ${hdUrl}`;
}

    const buttons = [
      {
        type: "postback",
        title: "🎲 Random",
        payload: "nasa random",
      },
      {
        type: "web_url",
        url: hdUrl,
        title: "🖼️ High-Res",
      },
      {
      
  type: "web_url",
        url: "https://apod.nasa.gov/apod/archivepix.html",
        title: "📚 Archive",
      },
    ];
await api.sendButton(msg, buttons, senderID);
  } catch (error) {
    console.error("NASA API Error:", error.message);
if (error.response?.status === 400) {
      api.sendMessage(
        "❌ Invalid date. Use format: nasa YYYY-MM-DD (e.g., nasa 2024-12-25)\nOr try: nasa random",
        senderID,
      );
} else {
      api.sendMessage("❌ Error connecting to NASA. Try again later!", senderID);
}
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
