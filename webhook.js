const config = require("./config.json");
const utils = require("./modules/utils");
const path = require("path");

// ✅ Now strictly in RAM (No file writing = No lag on Render)
let messagesCache = new Map();

module.exports.listen = (event) => {
  try {
    if (!event || event.object !== "page") return;

    event.entry.forEach((entry) => {
      entry.messaging.forEach(async (ev) => {
        if (!ev.sender || !ev.sender.id) return;

        if (global.BANNED_USERS && global.BANNED_USERS.has(ev.sender.id)) return;

        ev.type = await utils.getEventType(ev);
        global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;

        if (ev.message && ev.message.mid) {
          // Keep only last 1000 messages in RAM
          if (messagesCache.size > 1000) {
              const oldestKey = messagesCache.keys().next().value;
              messagesCache.delete(oldestKey);
          }
          messagesCache.set(ev.message.mid, {
            text: ev.message.text,
            attachments: ev.message.attachments
          });
        }

        if (ev.type === "message_reply") {
          const cachedMsg = messagesCache.get(ev.message.reply_to?.mid);
          if (cachedMsg) {
            ev.message.reply_to.text = cachedMsg.text || null;
            ev.message.reply_to.attachments = cachedMsg.attachments || null;
          }
        }

        if (ev.message?.is_echo) return;
        utils.log(ev);
        require("./page/main")(ev);
      });
    });
  } catch (error) { console.error("🔥 Webhook Error:", error.message); }
};
