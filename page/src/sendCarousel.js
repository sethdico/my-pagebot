const axios = require("axios");
// UPDATED PATH: Points to config/config.json
const { API_VERSION } = require("../../config/config.json");

module.exports = function (event) {
  return async function sendCarousel(elements, senderID) {
    const recipientID = senderID || event.sender.id;

    /* 
     ELEMENT STRUCTURE:
     {
       title: "Card Title",
       subtitle: "Card description",
       image_url: "https://...",
       buttons: [ { type: "web_url", ... } ]
     }
    */

    // Sanitize: Max 10 elements allowed by Facebook
    const sanitizedElements = elements.slice(0, 10);

    try {
      await axios.post(
        `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
        {
          recipient: { id: recipientID },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                image_aspect_ratio: "horizontal",
                elements: sanitizedElements
              }
            }
          }
        }
      );
    } catch (e) {
      console.error("Carousel Error:", e.response?.data || e.message);
    }
  };
};
