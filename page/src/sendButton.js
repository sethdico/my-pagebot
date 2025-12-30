const axios = require("axios");

module.exports = function (event) {
  return function sendButton(text, buttons, senderID) {
    const recipientID = senderID || event.sender.id;
    
    // Lite rendering: Keep text short for that "top-right" look
    const safeText = text.length > 600 ? text.substring(0, 597) + "..." : text;

    const formattedButtons = buttons.slice(0, 3).map(btn => {
      if (btn.type === "web_url") return { type: "web_url", url: btn.url, title: btn.title };
      
      // CHANGE: Use 'type: text' if available, otherwise 'postback'
      // FB Lite handles text-trigger buttons more reliably
      return { 
        type: "postback", 
        title: btn.title, 
        payload: btn.payload || btn.title.toLowerCase() 
      };
    });

    return axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, {
      recipient: { id: recipientID },
      message: {
        attachment: {
          type: "template",
          payload: { template_type: "button", text: safeText, buttons: formattedButtons }
        }
      }
    }).catch(e => console.error("Button Fail"));
  };
};
