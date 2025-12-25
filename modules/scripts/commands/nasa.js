const { http } = require("../../utils");

module.exports.config = {
  name: "nasa",
  author: "Sethdico",
  version: "1.5-Fast",
  category: "Fun",
  description: "Space photo of the day.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
  const apiKey = process.env.NASA_API_KEY; 
  let url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
  if (args[0] === "random") url += "&count=1";

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

  try {
    const res = await http.get(url);
    const data = Array.isArray(res.data) ? res.data[0] : res.data;

    const msg = `🌌 **${data.title}**\n📅 ${data.date}\n\n${data.explanation.substring(0, 400)}...`;

    if (data.media_type === "image") {
      await api.sendAttachment("image", data.hdurl || data.url, event.sender.id);
    }
    
    // Buttons sometimes fail on mobile, so we send text first
    const buttons = [{ type: "postback", title: "🎲 Random", payload: "nasa random" }];
    api.sendButton(msg, buttons, event.sender.id);

  } catch (error) {
    api.sendMessage("❌ NASA servers are busy.", event.sender.id);
  }
};
