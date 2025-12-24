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
  // Updated API Key provided by user
  const NASA_API_KEY = "i6QqbYpOj2c7JpvzuWAWYEnOuzRFmZAnMYozP7tI"; 
  
  const isRandom = args[0]?.toLowerCase() === "random";
  let apiUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

  if (isRandom) {
    apiUrl += "&count=1";
  }

  // Visual feedback: Start typing
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const response = await axios.get(apiUrl, { timeout: 10000 });
    let data = response.data;

    // NASA returns an array when using 'count', but an object when fetching 'today'
    if (Array.isArray(data)) data = data[0];

    if (!data) throw new Error("No data received from NASA");

    const title = data.title || "NASA Astronomy Picture";
    const date = data.date || "Unknown Date";
    const explanation = data.explanation || "No description available.";
    const mediaType = data.media_type; 
    const hdUrl = data.hdurl || data.url;

    // Truncate explanation to 450 chars. 
    // Facebook Button Templates fail if text is over 640 characters.
    const cleanExplanation = explanation.length > 450 
      ? explanation.substring(0, 450) + "..." 
      : explanation;

    const msg = `🌌 **NASA: ${title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n📅 **Date:** ${date}\n\n📝 ${cleanExplanation}\n━━━━━━━━━━━━━━━━`;

    // 1. Handle Images
    if (mediaType === "image") {
      await api.sendAttachment("image", hdUrl, senderID);
    } 
    
    // 2. Prepare Buttons
    const buttons = [
      { 
        type: "postback", 
        title: "🎲 Random Photo", 
        payload: "nasa random" 
      }
    ];

    // Add external link for high-res or video
    if (hdUrl) {
        buttons.push({ 
          type: "web_url", 
          url: hdUrl, 
          title: mediaType === "video" ? "🎥 Watch Video" : "🖼️ View HD" 
        });
    }

    // 3. Send the final UI
    await api.sendButton(msg, buttons, senderID);

  } catch (error) {
    console.error("NASA API Error:", error.message);
    const errorMsg = error.response?.status === 403 
      ? "❌ NASA API Key is invalid or expired." 
      : "❌ NASA servers are busy. Please try again later.";
    api.sendMessage(errorMsg, senderID);
  } finally {
    // Ensure typing indicator always turns off
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
