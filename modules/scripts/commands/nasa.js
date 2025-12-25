const axios = require("axios");

module.exports.config = {
  name: "nasa",
  author: "Sethdico (Improved)",
  version: "1.5",
  category: "Fun",
  description: "View NASA's Astronomy Picture of the Day.\nUsage:\n• nasa (Today's photo)\n• nasa random (A surprise photo)",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
  const senderID = event.sender.id;
  
  // ✅ FIXED: Pulled from Environment
  const NASA_API_KEY = process.env.NASA_API_KEY; 
  
  const isRandom = args[0]?.toLowerCase() === "random";
  let apiUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

  if (isRandom) {
    apiUrl += "&count=1";
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const response = await axios.get(apiUrl, { timeout: 10000 });
    let data = response.data;
    if (Array.isArray(data)) data = data[0];

    if (!data) throw new Error("No data received from NASA");

    const title = data.title || "NASA Astronomy Picture";
    const date = data.date || "Unknown Date";
    const explanation = data.explanation || "No description available.";
    const mediaType = data.media_type; 
    const hdUrl = data.hdurl || data.url;

    const cleanExplanation = explanation.length > 450 
      ? explanation.substring(0, 450) + "..." 
      : explanation;

    const msg = `🌌 **NASA: ${title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n📅 **Date:** ${date}\n\n📝 ${cleanExplanation}\n━━━━━━━━━━━━━━━━`;

    if (mediaType === "image") {
      await api.sendAttachment("image", hdUrl, senderID);
    } 
    
    const buttons = [
      { 
        type: "postback", 
        title: "🎲 Random Photo", 
        payload: "nasa random" 
      }
    ];

    if (hdUrl) {
        buttons.push({ 
          type: "web_url", 
          url: hdUrl, 
          title: mediaType === "video" ? "🎥 Watch Video" : "🖼️ View HD" 
        });
    }

    await api.sendButton(msg, buttons, senderID);

  } catch (error) {
    console.error("NASA API Error:", error.message);
    api.sendMessage("❌ NASA servers are busy.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
