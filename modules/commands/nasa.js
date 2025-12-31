const { http } = require("../utils");

module.exports.config = {
  name: "nasa",
  author: "Sethdico",
  version: "2.0",
  category: "Fun",
  description: "space photo of the day",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
  const apiKey = process.env.NASA_API_KEY; 
  let url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
  if (args[0] === "random") url += "&count=1";

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

  try {
    const res = await http.get(url);
    const data = Array.isArray(res.data) ? res.data[0] : res.data;

    const desc = data.explanation.length > 500 
      ? data.explanation.substring(0, 497) + "..." 
      : data.explanation;

    const msg = `${data.title}\n${data.date}\n\n${desc}`;

    if (data.media_type === "image") {
      await api.sendAttachment("image", data.hdurl || data.url, event.sender.id);
    }
    
    const buttons = [{ type: "postback", title: "random", payload: "nasa random" }];
    api.sendButton(msg, buttons, event.sender.id);

  } catch (e) {
    api.sendMessage("nasa api unavailable", event.sender.id);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id).catch(()=>{});
  }
};
