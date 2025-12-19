const config = require("./config.json");
const utils = require("./modules/utils");
const fs = require("fs");

let messagesCache = {};
const messagesFilePath = "./page/data.json";

// Load cache if exists and clearData is false
if (!config.clearData && fs.existsSync(messagesFilePath)) {
  try {
    messagesCache = JSON.parse(fs.readFileSync(messagesFilePath, "utf8"));
  } catch (e) {
    console.error("Failed to load messages cache:", e);
  }
}

function writeToFile() {
  try {
    fs.writeFileSync(messagesFilePath, JSON.stringify(messagesCache, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to write messages cache:", e);
  }
}

module.exports.listen = function (event) {
  try {
    if (event.object === "page") {
      event.entry.forEach((entry) => {
        entry.messaging.forEach(async (ev) => {
          // Determine event type
          ev.type = await utils.getEventType(ev);
          global.PAGE_ACCESS_TOKEN = config.PAGE_ACCESS_TOKEN;

          // Cache message data
          if (ev.message && ev.message.mid) {
            messagesCache[ev.message.mid] = {
              text: ev.message.text,
              attachments: ev.message.attachments
            };
            writeToFile();
          }

          // Handle reply context
          if (ev.type === "message_reply") {
            const repliedMid = ev.message.reply_to?.mid;
            if (repliedMid && messagesCache[repliedMid]) {
              ev.message.reply_to.text = messagesCache[repliedMid].text || null;
              ev.message.reply_to.attachments = messagesCache[repliedMid].attachments || null;
            }
          }

          // Skip self messages if configured
          if (config.selfListen && ev?.message?.is_echo) return;

          // Log and forward to main handler
          utils.log(ev);
          require("./page/main")(ev);
        });
      });
    }
  } catch (error) {
    console.error("Webhook error:", error);
  }
};
