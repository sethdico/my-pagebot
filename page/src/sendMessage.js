const axios = require("axios");
const { API_VERSION } = require("../../config.json");

module.exports = function (event) {
  return async function sendMessage(text, senderID) {
    const recipientID = senderID || event.sender.id;
    if (!text) return;

    // Convert non-string input safely
    const content = String(text);

    // Helper to split text without breaking words
    const splitMessage = (str, size) => {
      const numChunks = Math.ceil(str.length / size);
      const chunks = new Array(numChunks);
      for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.substr(o, size);
      }
      return chunks;
    };

    // Facebook limit is 2000, we use 1900 to be safe
    const chunks = splitMessage(content, 1900);

    for (const chunk of chunks) {
      try {
        await axios.post(
          `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
          {
            recipient: { id: recipientID },
            message: { text: chunk },
            messaging_type: "RESPONSE"
          }
        );
        // Small delay between chunks to ensure order
        await new Promise(res => setTimeout(res, 100)); 
      } catch (e) {
        console.error("SendMessage Error:", e.message);
      }
    }
  };
};
