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
  const NASA_API_KEY = "CXbr4ovi6dMLNxbV9XfgBxyskEMbt1Mti7YmXx50"; // Using DEMO_KEY usually works for low volume, or stick to your previous key if valid
  // Check if user wants a random date
  const isRandom = args[0]?.toLowerCase() === "random";
  let apiUrl = `https:                                                       
  if (isRandom) {
    apiUrl += "&count=1";
  }
  api.sendTypingIndicator(true, senderID);
  try {
    const response = await axios.get(apiUrl);
    let data = response.data;
                                          
    if (Array.isArray(data)) data = data[0];
    const title = data.title || "NASA Astronomy Picture";
    const date = data.date;
    const explanation = data.explanation || "No description provided.";
    const mediaType = data.media_type;                      
    const hdUrl = data.hdurl || data.url;
    let msg = `//api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
  if (isRandom) {
    apiUrl += "&count=1";
  }
  api.sendTypingIndicator(true, senderID);
  try {
    const response = await axios.get(apiUrl);
    let data = response.data;
    // If random, the API returns an array
    if (Array.isArray(data)) data = data[0];
    const title = data.title || "NASA Astronomy Picture";
    const date = data.date;
    const explanation = data.explanation || "No description provided.";
    const mediaType = data.media_type; // 'image' or 'video'
    const hdUrl = data.hdurl || data.url;
    let msg = `🌌 **NASA: ${title.toUpperCase()}** ━━━━━━━━━━━━━━━━ 📅 **Date:** ${date} 📝 **Explanation:** ${explanation.length > 500 ? explanation.substring(0, 500) + "..." : explanation} ━━━━━━━━━━━━━━━━`;
                   
    if (mediaType === "image") {
      await api.sendAttachment("image", hdUrl, senderID);
    } else if (mediaType === "video") {
      msg += `// Handle Media
    if (mediaType === "image") {
      await api.sendAttachment("image", hdUrl, senderID);
    } else if (mediaType === "video") {
      msg += `\n\n🎥 **Video Link:** ${hdUrl}`;
    }
    const buttons = [
      { type: "postback", title: "🎲 Random Date", payload: "nasa random" },
      { type: "web_url", url: hdUrl, title: "🖼️ View High-Res" }
    ];
    await api.sendButton(msg, buttons, senderID);
  } catch (error) {
    console.error("NASA API Error:", error.message);
    api.sendMessage("❌ Error connecting to NASA. Try again later!", senderID);
  } finally {
    api.sendTypingIndicator(false, senderID);
  }
};
