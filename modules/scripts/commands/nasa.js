const axios = require("axios");

// Cache for "Today's" picture only
let apodCache = { data: null, timestamp: 0 };
const CACHE_DURATION = 4 * 60 * 60 * 1000; 

module.exports.config = {
  name: "nasa",
  author: "Sethdico (Carousel-Mode)",
  version: "4.0",
  category: "Fun",
  description: "NASA APOD. Use 'nasa random' for a gallery view.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const isRandom = args[0]?.toLowerCase() === "random";
  const dateQuery = args[0] && /^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? args[0] : null;

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(()=>{});

  try {
    const apiKey = "DEMO_KEY"; // Replace with yours if rate limited

    // --- CAROUSEL MODE (Random) ---
    if (isRandom) {
      // Fetch 5 random images
      const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&count=5`;
      const res = await axios.get(url, { timeout: 15000 });
      const data = res.data.filter(item => item.media_type === "image"); // Carousels need images

      if (data.length === 0) return api.sendMessage("❌ No random images found.", senderID);

      // Map to Carousel Elements
      const elements = data.map(item => ({
        title: item.title,
        subtitle: item.date,
        image_url: item.url,
        buttons: [
            { 
                type: "web_url", 
                url: item.hdurl || item.url, 
                title: "🖼️ High Res" 
            },
            {
                type: "web_url",
                url: "https://apod.nasa.gov/apod/astropix.html",
                title: "📚 Source"
            }
        ]
      }));

      // Send Carousel
      if (api.sendCarousel) {
          await api.sendCarousel(elements, senderID);
      } else {
          // Fallback if sendCarousel isn't loaded
          api.sendAttachment("image", data[0].url, senderID);
      }
      return;
    }

    // --- STANDARD MODE (Today/Specific Date) ---
    let data;
    const now = Date.now();
    
    // Check Cache
    if (!dateQuery && apodCache.data && (now - apodCache.timestamp < CACHE_DURATION)) {
      data = apodCache.data;
    } else {
      let url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
      if (dateQuery) url += `&date=${dateQuery}`;
      const res = await axios.get(url);
      data = res.data;
      if (!dateQuery) apodCache = { data, timestamp: now };
    }

    // Single Message logic
    const title = data.title || "Space Image";
    const desc = data.explanation ? (data.explanation.substring(0, 300) + "...") : "No desc.";
    const msg = `🌌 **${title}**\n📅 ${data.date}\n━━━━━━━━━━━━━━━━\n${desc}`;

    if (data.media_type === "video") {
      api.sendMessage(`${msg}\n\n🎥 **Watch:** ${data.url}`, senderID);
    } else {
      // Send image first, then text
      api.sendAttachment("image", data.hdurl || data.url, senderID).catch(()=>{});
      api.sendMessage(msg, senderID);
    }

  } catch (error) {
    console.error("NASA Error:", error.message);
    api.sendMessage("❌ NASA API is momentarily down.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(()=>{});
  }
};
