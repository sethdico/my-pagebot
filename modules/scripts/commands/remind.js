const fs = require("fs")
const path = require("path")
const api = require("path_to_api_module") // Declare the api variable

const REMINDERS_FILE = path.join(__dirname, "../../../reminders.json")

let activeReminders = []
if (fs.existsSync(REMINDERS_FILE)) {
  try {
    activeReminders = JSON.parse(fs.readFileSync(REMINDERS_FILE, "utf8"))
    activeReminders = activeReminders.filter((r) => r.fireAt > Date.now())
    activeReminders.forEach((reminder) => {
      const delay = reminder.fireAt - Date.now()
      if (delay > 0) {
        setTimeout(() => {
          api.sendMessage(
            `⏰ **REMINDER**\n━━━━━━━━━━━━\n"${reminder.message}"\n\n⏱️ Set ${Math.round((Date.now() - reminder.setAt) / 60000)} minutes ago.`,
            reminder.userId,
          )
          activeReminders = activeReminders.filter((r) => r.id !== reminder.id)
          saveReminders()
        }, delay)
      }
    })
  } catch (e) {
    console.error("[remind.js] Failed to load reminders:", e)
    activeReminders = []
  }
}

function saveReminders() {
  try {
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(activeReminders, null, 2))
  } catch (e) {
    console.error("[remind.js] Failed to save reminders:", e)
  }
}

module.exports.config = {
  name: "remind",
  author: "Sethdico (Enhanced)",
  version: "2.0",
  category: "Utility",
  description: "Set reminders with persistence (s/m/h/d)",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
}

module.exports.run = async ({ event, args }) => {
  const senderID = event.sender.id

  if (args[0]?.toLowerCase() === "list") {
    const userReminders = activeReminders.filter((r) => r.userId === senderID)

    if (userReminders.length === 0) {
      return api.sendMessage("📝 You have no active reminders.", senderID)
    }

    let msg = `📝 **YOUR REMINDERS** (${userReminders.length})\n━━━━━━━━━━━━━━━━\n`

    userReminders.forEach((r, idx) => {
      const remaining = Math.max(0, r.fireAt - Date.now())
      const minutes = Math.round(remaining / 60000)
      const hours = Math.round(remaining / 3600000)

      const timeStr = hours > 1 ? `${hours}h` : `${minutes}m`
      msg += `${idx + 1}. "${r.message}" - in ${timeStr}\n`
    })

    msg += `━━━━━━━━━━━━━━━━`
    return api.sendMessage(msg, senderID)
  }

  if (args[0]?.toLowerCase() === "clear" || args[0]?.toLowerCase() === "cancel") {
    const userReminders = activeReminders.filter((r) => r.userId === senderID)

    if (userReminders.length === 0) {
      return api.sendMessage("ℹ️ You have no reminders to clear.", senderID)
    }

    activeReminders = activeReminders.filter((r) => r.userId !== senderID)
    saveReminders()

    return api.sendMessage(`✅ Cleared ${userReminders.length} reminder(s).`, senderID)
  }

  const input = args.join(" ")
  const match = input.match(/^(\d+)([smhd])\s+(.+)$/)

  if (!match) {
    return api.sendMessage(
      "⚠️ **Usage:**\n" +
        "• remind 10m Check oven\n" +
        "• remind 2h Call mom\n" +
        "• remind 1d Pay bills\n\n" +
        "**Other commands:**\n" +
        "• remind list - View active reminders\n" +
        "• remind clear - Cancel all reminders\n\n" +
        "(s=sec, m=min, h=hour, d=day)",
      senderID,
    )
  }

  const value = Number.parseInt(match[1])
  const unit = match[2]
  const message = match[3]

  let delay = 0
  let unitName = ""

  if (unit === "s") {
    delay = value * 1000
    unitName = "second"
  } else if (unit === "m") {
    delay = value * 60 * 1000
    unitName = "minute"
  } else if (unit === "h") {
    delay = value * 60 * 60 * 1000
    unitName = "hour"
  } else if (unit === "d") {
    delay = value * 24 * 60 * 60 * 1000
    unitName = "day"
  }

  if (delay > 30 * 24 * 60 * 60 * 1000) {
    return api.sendMessage("⚠️ Maximum reminder time is 30 days.", senderID)
  }

  if (delay < 1000) {
    return api.sendMessage("⚠️ Minimum reminder time is 1 second.", senderID)
  }

  const reminder = {
    id: Date.now() + Math.random(),
    userId: senderID,
    message: message,
    setAt: Date.now(),
    fireAt: Date.now() + delay,
    delay: delay,
    unit: unit,
    value: value,
  }

  activeReminders.push(reminder)
  saveReminders()

  const pluralUnit = value > 1 ? unitName + "s" : unitName
  api.sendMessage(
    `⏰ **REMINDER SET**\n━━━━━━━━━━━━\n` +
      `📝 Message: "${message}"\n` +
      `⏱️ Time: ${value} ${pluralUnit}\n` +
      `🕐 Will notify at: ${new Date(reminder.fireAt).toLocaleTimeString()}\n\n` +
      `💡 Type "remind list" to see all reminders`,
    senderID,
  )

  setTimeout(() => {
    api.sendMessage(
      `⏰ **REMINDER**\n━━━━━━━━━━━━\n` + `"${message}"\n\n` + `⏱️ Set ${value} ${pluralUnit} ago.`,
      senderID,
    )

    activeReminders = activeReminders.filter((r) => r.id !== reminder.id)
    saveReminders()
  }, delay)
}
