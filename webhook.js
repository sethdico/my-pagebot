const config = require("./config.json");
const utils = require("./modules/utils");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

// ✅ OPTIMIZATION: Use Map for O(1) insertions and FIFO order
let messagesCache = new Map();
const messagesFilePath = path.join(__dirname, "page/data.json");

let saveTimer = null;
let isSaving = false;

// ✅ Load cache on startup and convert to Map
(async function loadCache() {
  if (fsSync.existsSync(messagesFilePath)) {
    try {
      const data = await fs.readFile(messagesFilePath, "utf8");
      const json = JSON.parse(data);
      // Convert Object back to Map
      messagesCache = new Map(Object.entries(json));
      console.log(`📦 Loaded ${messagesCache.size} cached messages`);
    } catch (e) {
      console.error("⚠️ Cache file corrupted, starting fresh:", e.message);
      messagesCache = new Map();
    }
  }
})();

// ✅ OPTIMIZATION: Trigger Save with O(1) Pruning (No sorting)
async function triggerSave() {
  if (saveTimer) clearTimeout(saveTimer);
  
  saveTimer = setTimeout(async () => {
    if (isSaving) return;
    isSaving = true;
    
    try {
      // ✅ O(1) Pruning: Javascript Maps preserve insertion order.
      // The first item in the iterator is the oldest.
      // We just delete from the front until size is 1000.
      while (messagesCache.size > 1000) {
        const oldestKey = messagesCache.keys().next().value;
        messagesCache.delete(oldestKey);
      }
      
      // Convert Map to Object for saving
      const cacheObj = Object.fromEntries(messagesCache);
      await fs.writeFile(messagesFilePath, JSON.stringify(cacheObj, null, 2), "utf8");
      
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

    event.entry.forEach((entry) => {
      entry.messaging.forEach(async (ev) => {
        if (!ev.sender || !ev.sender.id) return;

        // ✅ OPTIMIZATION: O(1) Lookup using Global Set
        // No file reading here!
        if (global.BANNED_USERS && global.BANNED_USERS.has(ev.sender.id)) {
          console.log(`🚫 Blocked message from banned user: ${ev.sender.id}`);
          return;
        }

        ev.type = await utils.getEventType(ev);
        global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;

        // ✅ Cache Logic using Map
        if (ev.message && ev.message.mid) {
          // Deleting and re-setting ensures the key moves to the "end" (newest)
          // ensuring accurate LRU behavior even if ID existed
          if (messagesCache.has(ev.message.mid)) {
              messagesCache.delete(ev.message.mid);
          }
          messagesCache.set(ev.message.mid, {
            text: ev.message.text,
            attachments: ev.message.attachments,
            timestamp: Date.now(),
          });
          triggerSave();
        }

        if (ev.type === "message_reply") {
          const repliedMid = ev.message.reply_to?.mid;
          if (repliedMid) {
            // ✅ Map .get() is O(1)
            const cachedMsg = messagesCache.get(repliedMid);
            if (cachedMsg) {
              ev.message.reply_to.text = cachedMsg.text || null;
              ev.message.reply_to.attachments = cachedMsg.attachments || null;
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
    const cacheObj = Object.fromEntries(messagesCache);
    await fs.writeFile(messagesFilePath, JSON.stringify(cacheObj, null, 2));
    console.log("✅ Cache saved successfully");
  } catch (e) {
    console.error("❌ Failed to save cache:", e.message);
  }
  process.exit(0);
});
