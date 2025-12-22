const config = require("./config.json")
const utils = require("./modules/utils")
const fs = require("fs")
const path = require("path")

let messagesCache = {}
const messagesFilePath = path.join(__dirname, "page/data.json")
const bannedPath = path.join(__dirname, "modules/scripts/commands/banned.json")

let saveTimer = null

if (fs.existsSync(messagesFilePath)) {
  try {
    const data = fs.readFileSync(messagesFilePath, "utf8")
    messagesCache = JSON.parse(data)
    console.log(`📦 Loaded ${Object.keys(messagesCache).length} cached messages`)
  } catch (e) {
    console.error("⚠️ Cache file corrupted, starting fresh:", e.message)
    messagesCache = {}
  }
}

function triggerSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const keys = Object.keys(messagesCache)
      if (keys.length > 1000) {
        const toDelete = keys.slice(0, keys.length - 1000)
        toDelete.forEach((key) => delete messagesCache[key])
        console.log(`🧹 Trimmed cache: removed ${toDelete.length} old messages`)
      }
      fs.writeFile(messagesFilePath, JSON.stringify(messagesCache, null, 2), "utf8", (err) => {
        if (err) console.error("⚠️ Cache Save Error:", err.message)
      })
    } catch (e) {
      console.error("Cache Logic Error:", e.message)
    }
  }, 5000)
}

module.exports.listen = (event) => {
  try {
    if (!event || typeof event !== "object" || event.object !== "page") return

    let bannedList = []
    if (fs.existsSync(bannedPath)) {
      try {
        bannedList = JSON.parse(fs.readFileSync(bannedPath))
      } catch (e) {
        console.error("⚠️ Banned list corrupted:", e.message)
        bannedList = []
      }
    }

    event.entry.forEach((entry) => {
      entry.messaging.forEach(async (ev) => {
        if (!ev.sender || !ev.sender.id) return

        if (bannedList.includes(ev.sender.id)) {
          console.log(`🚫 Blocked message from banned user: ${ev.sender.id}`)
          return
        }

        ev.type = await utils.getEventType(ev)
        global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN

        if (ev.message && ev.message.mid) {
          messagesCache[ev.message.mid] = {
            text: ev.message.text,
            attachments: ev.message.attachments,
            timestamp: Date.now(), // Added timestamp for TTL
          }
          triggerSave()
        }

        if (ev.type === "message_reply") {
          const repliedMid = ev.message.reply_to?.mid
          if (repliedMid) {
            if (messagesCache[repliedMid]) {
              ev.message.reply_to.text = messagesCache[repliedMid].text || null
              ev.message.reply_to.attachments = messagesCache[repliedMid].attachments || null
            } else {
              console.log(`⚠️ Reply context not found for mid: ${repliedMid}`)
            }
          }
        }

        if (config.selfListen && ev?.message?.is_echo) return
        if (ev.message?.is_echo) return

        utils.log(ev)
        require("./page/main")(ev)
      })
    })
  } catch (error) {
    console.error("🔥 Webhook Logic Error:", error.message)
    console.error(error.stack)
  }
}

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down... Saving cache...")
  try {
    fs.writeFileSync(messagesFilePath, JSON.stringify(messagesCache, null, 2))
    console.log("✅ Cache saved successfully")
  } catch (e) {
    console.error("❌ Failed to save cache:", e.message)
  }
  process.exit(0)
})
