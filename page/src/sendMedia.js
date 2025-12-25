const axios = require("axios");

module.exports = function (event) {
  return async function sendMedia(url, mediaType, buttons = [], senderID) {
    const recipientID = senderID || event.sender.id;

    // fb allows max 3 buttons on media templates
    const formattedButtons = buttons.slice(0, 3).map(btn => {
      if (btn.type === "web_url") return { type: "web_url", url: btn.url, title: btn.title };
      return { type: "postback", title: btn.title, payload: btn.payload || "EMPTY" };
    });

    try {
      await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, {
        recipient: { id: recipientID },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "media",
              elements: [
                {
                  media_type: mediaType, // "image" or "video"
                  url: url,
                  buttons: formattedButtons.length > 0 ? formattedButtons : undefined
                }
              ]
            }
          }
        }
      });
    } catch (e) {
      console.error("❌ sendMedia fail:", e.response?.data || e.message);
    }
  };
};
