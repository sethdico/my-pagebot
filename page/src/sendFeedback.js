const axios = require("axios");

module.exports = function (event) {
  return async function sendFeedback(senderID) {
    const recipientID = senderID || event.sender.id;
    try {
      await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, {
        recipient: { id: recipientID },
        messaging_type: "RESPONSE",
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "customer_feedback",
              title: "Rate your experience with Amdusbot", // nonchalant title
              subtitle: "Help me improve",
              button_title: "Rate Now",
              feedback_screens: [{
                questions: [{
                  type: "csat", // Customer Satisfaction (1-5 stars)
                  title: "How satisfied are you with the bot?",
                  id: "csat_question"
                }]
              }]
            }
          }
        }
      });
    } catch (e) {
      console.error("❌ feedback failed");
    }
  };
};
