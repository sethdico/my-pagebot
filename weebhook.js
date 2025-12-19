const config = require("./config.json");
const utils = require("./modules/utils");
const fs = require("fs");

let messagesCache = {};
const messagesFilePath = "./page/data.json";

// Load cache if exists
if (!config.clearData && fs.existsSync(messagesFilePath)) {
  try { messagesCache = JSON.parse(fs.readFileSync(messagesFilePath, "utf8")); } catch (e) {}
}

function writeToFile() {
  fs.writeFileSync(messagesFilePath, JSON.stringify(messagesCache, null, 2), "utf8");
}

module.exports.listen = function (event) {
  try {
    if (event.object === "page") {
      event.entry.forEach((entry) => {
        entry.messaging.forEach(async (ev) => {
          ev.type = await utils.getEventType(ev);
          global.PAGE_ACCESS_TOKEN = config.PAGE_ACCESS_TOKEN;
          
          // Simple caching
          if (ev.message && ev.message.mid) {
             messagesCache[ev.message.mid] = { text: ev.message.text };
             writeToFile();
          }

          if (config.selfListen && ev?.message?.is_echo) return;
          
          utils.log(ev);
          require("./page/main")(ev);
        });
      });
    }
  } catch (error) { console.error(error); }
};
