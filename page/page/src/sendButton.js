const axios = require("axios");

module.exports = function (event) {
  return function sendButton(text, buttons, senderID) {
    const recipientID = senderID || event.sender.id;

    // Ensure buttons have the correct structure
    const formattedButtons = buttons.map(btn => {
      if (btn.type === "web_url") {
        return { type: "web_url", url: btn.url, title: btn.title };
      } else {
        return { type: "postback", title: btn.title, payload: btn.payload || "EMPTY" };
      }
    });

    const form = {
      recipient: { id: recipientID },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: text,
            buttons: formattedButtons
          }
        }
      }
    };

    return axios.post(
      `https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
      form
    ).catch(err => {
      console.error("SendButton Error:", err.response ? err.response.data : err.message);
      throw err; // Throw so the handler knows it failed
    });
  };
};
