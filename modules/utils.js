const config = require("../config.json");

function getEventType(event) {
  return new Promise((resolve) => {
    let type = "unknown";
    if (event.message) {
      if (event.message.attachments) type = "attachments";
      else if (event.message.reply_to) type = "message_reply";
      else type = "message";
    } else if (event.postback) type = "postback";
    resolve(type);
  });
}

function log(event) {
  const adminList = config.ADMINS || [];
  const sender = adminList.includes(event.sender?.id) ? "ADMIN" : "USER";
  const maskedId = event.sender?.id ? `...${event.sender.id.slice(-4)}` : "unknown";
  
  // Clean console log without extra dependencies
  console.log(`[ ${sender} ] (${maskedId}): Event Received`);
}

module.exports = { log, getEventType };
