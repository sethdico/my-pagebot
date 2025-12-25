const config = require("./config.json");
const utils = require("./modules/utils");

let messagesCache = new Map();

module.exports.listen = (event) => {
  if (!event || event.object !== "page") return;

  event.entry.forEach((entry) => {
    entry.messaging.forEach(async (ev) => {
      // block banned users immediately
      if (!ev.sender?.id || (global.BANNED_USERS && global.BANNED_USERS.has(ev.sender.id))) return;

      ev.type = await utils.getEventType(ev);

      // context caching
      if (ev.message?.mid) {
        if (messagesCache.size > 1000) messagesCache.delete(messagesCache.keys().next().value);
        messagesCache.set(ev.message.mid, { text: ev.message.text, attachments: ev.message.attachments });
      }

      // reply context
      if (ev.type === "message_reply") {
        const cached = messagesCache.get(ev.message.reply_to?.mid);
        if (cached) {
            ev.message.reply_to.text = cached.text;
            ev.message.reply_to.attachments = cached.attachments;
        }
      }

      if (ev.message?.is_echo) return;
      utils.log(ev);
      require("./page/main")(ev);
    });
  });
};
