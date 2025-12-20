const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const { API_VERSION } = require("../../config.json");

module.exports = function (event) {
  return async function sendAttachment(type, source, senderID) {
    const recipientID = senderID || event.sender.id;
    const accessToken = global.PAGE_ACCESS_TOKEN;
    const isUrl = typeof source === 'string' && source.startsWith('http');
    const mediaType = ['image', 'audio', 'video'].includes(type) ? type : 'file';

    try {
      if (isUrl) {
        await axios.post(`https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${accessToken}`, {
          recipient: { id: recipientID },
          message: { attachment: { type: mediaType, payload: { url: source, is_reusable: true } } }
        });
      } else {
        const form = new FormData();
        form.append("recipient", JSON.stringify({ id: recipientID }));
        form.append("message", JSON.stringify({ attachment: { type: mediaType, payload: { is_reusable: true } } }));
        form.append("filedata", fs.createReadStream(source));
        await axios.post(`https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${accessToken}`, form, { headers: form.getHeaders() });
      }
    } catch (err) { console.error("Attachment Failed", err.message); }
  };
};
