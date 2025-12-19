const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

module.exports = function (event) {
  return async function sendAttachment(type, source, senderID) {
    const recipientID = senderID || event.sender.id;
    const accessToken = global.PAGE_ACCESS_TOKEN;

    const isUrl = typeof source === 'string' && (source.startsWith('http'));
    const mediaType = ['image', 'audio', 'video'].includes(type) ? type : 'file';

    try {
      if (isUrl) {
        await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`, {
          recipient: { id: recipientID },
          message: { attachment: { type: mediaType, payload: { url: source, is_reusable: true } } }
        });
      } else {
        const form = new FormData();
        form.append("recipient", JSON.stringify({ id: recipientID }));
        form.append("message", JSON.stringify({ attachment: { type: mediaType, payload: { is_reusable: true } } }));
        form.append("filedata", fs.createReadStream(source));

        const uploadRes = await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${accessToken}`, form, { headers: form.getHeaders() });
      }
    } catch (err) {
      console.error("Attachment Error:", err.response ? err.response.data : err.message);
    }
  };
};
