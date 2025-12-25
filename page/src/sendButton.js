const axios = require("axios");

module.exports = function (event) {
  return function sendButton(text, buttons, senderID) {
    const recipientID = senderID || event.sender.id;
    // ✅ Truncate to 600 to prevent 640-character crash
    const safeText = text.length > 600 ? text.substring(0, 597) + "..." : text;

    const formattedButtons = buttons.map(btn => {
      if (btn.type === "web_url") return { type: "web_url", url: btn.url, title: btn.title };
      return { type: "postback", title: btn.title, payload: btn.payload || "EMPTY" };
    });

    return axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, {
      recipient: { id: recipientID },
      message: {
        attachment: {
          type: "template",
          payload: { template_type: "button", text: safeText, buttons: formattedButtons }
        }
      }
    }).catch(e => console.error("SendButton Fail"));
  };
};
