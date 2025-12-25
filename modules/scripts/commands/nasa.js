const axios = require("axios");

module.exports.config = {
  name: "nasa",
  author: "Sethdico (Improved)",
  version: "1.5",
  category: "Fun",
  description: "View NASA's Astronomy Picture of the Day.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
  const senderID = event.sender.id;
  
  // ✅ SECURED: Pulled from Render Environment
  const NASA_API_KEY = process.env.NASA_API_KEY; 
  
  const isRandom = args[0]?.toLowerCase() === "random";
  let apiUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
  if (isRandom) apiUrl += "&count=1";

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const response = await axios.get(apiUrl, { timeout: 10000 });
    let data = Array.isArray(response.data) ? response.data[0] : response.data;

    const title = data.title || "NASA Astronomy Picture";
    const date = data.date || "Unknown Date";
    const explanation = data.explanation || "No description available.";
    const mediaType = data.media_type; 
    const hdUrl = data.hdurl || data.url;

    const cleanExplanation = explanation.length > 450 ? explanation.substring(0, 450) + "..." : explanation;
    const msg = `🌌 **NASA: ${title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n📅 **Date:** ${date}\n\n📝 ${cleanExplanation}\n━━━━━━━━━━━━━━━━`;

    if (mediaType === "image") await api.sendAttachment("image", hdUrl, senderID);
    
    const buttons = [{ type: "postback", title: "🎲 Random Photo", payload: "nasa random" }];
    if (hdUrl) buttons.push({ type: "web_url", url: hdUrl, title: mediaType === "video" ? "🎥 Watch Video" : "🖼️ View HD" });

    await api.sendButton(msg, buttons, senderID);
  } catch (error) {
    api.sendMessage("❌ NASA servers are busy. Please try again later.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
