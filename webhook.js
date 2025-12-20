const config = require("./config.json");
const utils = require("./modules/utils");
const fs = require("fs");
const path = require("path");

let messagesCache = {};
const messagesFilePath = path.join(__dirname, "page/data.json");

// Load cache safely
if (fs.existsSync(messagesFilePath)) {
  try { messagesCache = JSON.parse(fs.readFileSync(messagesFilePath, "utf8")); } catch (e) { messagesCache = {}; }
}

function writeToFile() {
  try {
    const keys = Object.keys(messagesCache);
    // V2 Optimization: Keep cache small (500 items max)
    if (keys.length > 500) {
        const toDelete = keys.slice(0, keys.length - 500);
        toDelete.forEach(key => delete messagesCache[key]);
    }
    fs.writeFileSync(messagesFilePath, JSON.stringify(messagesCache, null, 2), "utf8");
  } catch (e) { console.error("Cache Write Error:", e.message); }
}

module.exports.listen = function (event) {
  try {
    // V2 Validation: Ensure event exists
    if (!event || typeof event !== 'object' || event.object !== "page") return;

    event.entry.forEach((entry) => {
      entry.messaging.forEach(async (ev) => {
        // V2 Validation: Ensure sender exists
        if (!ev.sender || !ev.sender.id) return;

        ev.type = await utils.getEventType(ev);
        global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;

        // Cache Logic
        if (ev.message && ev.message.mid) {
          messagesCache[ev.message.mid] = { text: ev.message.text, attachments: ev.message.attachments };
          writeToFile();
        }

        // Reply Handling
        if (ev.type === "message_reply") {
          const repliedMid = ev.message.reply_to?.mid;
          if (repliedMid && messagesCache[repliedMid]) {
            ev.message.reply_to.text = messagesCache[repliedMid].text || null;
            ev.message.reply_to.attachments = messagesCache[repliedMid].attachments || null;
          }
        }

        if (config.selfListen && ev?.message?.is_echo) return;
        if (ev.message?.is_echo) return;

        utils.log(ev);
        require("./page/main")(ev);
      });
    });
  } catch (error) { console.error("Webhook Logic Error:", error.message); }
};
