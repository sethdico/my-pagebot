const axios = require("axios");
module.exports = function (event) {
  return function sendMessage(text, senderID) {
    return axios.post(`https://graph.facebook.com/v20.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, {
      recipient: { id: senderID || event.sender.id },
      message: { text: text },
      messaging_type: "RESPONSE"
    }).then(r => r.data).catch(e => console.error(e.response ? e.response.data : e));
  };
};
