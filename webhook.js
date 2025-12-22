const config = require("./config.json");
const utils = require("./modules/utils");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

let messagesCache = {};
const messagesFilePath = path.join(__dirname, "page/data.json");
const bannedPath = path.join(__dirname, "modules/scripts/commands/banned.json");

let saveTimer = null;
let isSaving = false; // ✅ Prevent race conditions

// ✅ Load cache on startup
(async function loadCache() {
  if (fsSync.existsSync(messagesFilePath)) {
    try {
      const data = await fs.readFile(messagesFilePath, "utf8");
      messagesCache = JSON.parse(data);
      console.log(`📦 Loaded ${Object.keys(messagesCache).length} cached messages`);
    } catch (e) {
      console.error("⚠️ Cache file corrupted, starting fresh:", e.message);
      messagesCache = {};
    }
  }
})();

// ✅ Fixed save function with mutex
async function triggerSave() {
  if (saveTimer) clearTimeout(saveTimer);
  
  saveTimer = setTimeout(async () => {
    if (isSaving) return; // Prevent concurrent saves
    isSaving = true;
    
    try {
      const keys = Object.keys(messagesCache);
      
      // Trim old messages
      if (keys.length > 1000) {
        const sorted = keys.sort((a, b) => {
          const timeA = messagesCache[a].timestamp || 0;
          const timeB = messagesCache[b].timestamp || 0;
          return timeB - timeA; // Newest first
        });
        
        const toKeep = sorted.slice(0, 1000);
        const newCache = {};
        toKeep.forEach(key => newCache[key] = messagesCache[key]);
        messagesCache = newCache;
        
        console.log(`🧹 Trimmed cache: kept ${toKeep.length} newest messages`);
      }
      
      await fs.writeFile(messagesFilePath, JSON.stringify(messagesCache, null, 2), "utf8");
    } catch (e) {
      console.error("⚠️ Cache Save Error:", e.message);
    } finally {
      isSaving = false;
    }
  }, 5000);
}

module.exports.listen = (event) => {
  try {
    if (!event || typeof event !== "object" || event.object !== "page") return;

    let bannedList = [];
    if (fsSync.existsSync(bannedPath)) {
      try {
        bannedList = JSON.parse(fsSync.readFileSync(bannedPath));
      } catch (e) {
        console.error("⚠️ Banned list corrupted:", e.message);
        bannedList = [];
      }
    }

    event.entry.forEach((entry) => {
      entry.messaging.forEach(async (ev) => {
        if (!ev.sender || !ev.sender.id) return;

        if (bannedList.includes(ev.sender.id)) {
          console.log(`🚫 Blocked message from banned user: ${ev.sender.id}`);
          return;
        }

        ev.type = await utils.getEventType(ev);
        global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;

        if (ev.message && ev.message.mid) {
          messagesCache[ev.message.mid] = {
            text: ev.message.text,
            attachments: ev.message.attachments,
            timestamp: Date.now(),
          };
          triggerSave();
        }

        if (ev.type === "message_reply") {
          const repliedMid = ev.message.reply_to?.mid;
          if (repliedMid) {
            if (messagesCache[repliedMid]) {
              ev.message.reply_to.text = messagesCache[repliedMid].text || null;
              ev.message.reply_to.attachments = messagesCache[repliedMid].attachments || null;
            } else {
              console.log(`⚠️ Reply context not found for mid: ${repliedMid}`);
            }
          }
        }

        if (config.selfListen && ev?.message?.is_echo) return;
        if (ev.message?.is_echo) return;

        utils.log(ev);
        require("./page/main")(ev);
      });
    });
  } catch (error) {
    console.error("🔥 Webhook Logic Error:", error.message);
    console.error(error.stack);
  }
};

// ✅ Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down... Saving cache...");
  try {
    await fs.writeFile(messagesFilePath, JSON.stringify(messagesCache, null, 2));
    console.log("✅ Cache saved successfully");
  } catch (e) {
    console.error("❌ Failed to save cache:", e.message);
  }
  process.exit(0);
});
