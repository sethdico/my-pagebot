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
  if (event.message?.is_echo) return;
  // use global set
  const sender = global.ADMINS.has(event.sender?.id) ? "ADMIN" : "USER";
  const maskedId = event.sender?.id ? `...${event.sender.id.slice(-4)}` : "unknown";
  console.log(`[ ${sender} ] (${maskedId}): Event Received`);
}

module.exports = { log, getEventType };
