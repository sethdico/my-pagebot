const config = require("../config.json");
const theme = require("../website/web.js").getTheme();

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
  let sender = config.ADMINS.includes(event.sender?.id) ? "ADMIN" : "USER";
  if (event.message?.is_echo) sender = "BOT";
  console.log(`${theme.gradient.multiline(sender)}: Event Received`);
}

module.exports = { log, getEventType };
