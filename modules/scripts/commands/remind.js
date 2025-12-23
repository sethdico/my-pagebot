const fs = require("fs");
const path = require("path");
const REMINDERS_FILE = path.join(__dirname, "../../../reminders.json");

// ✅ OPTIMIZATION: Use Map for O(1) Access/Delete
let activeReminders = new Map();

// Load existing reminders
if (fs.existsSync(REMINDERS_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(REMINDERS_FILE, "utf8"));
    const now = Date.now();
    
    data.forEach((r) => {
      // Only keep future reminders
      if (r.fireAt > now) {
        activeReminders.set(r.id, r);
        scheduleReminder(r);
      }
    });
  } catch (e) {
    console.error("[remind.js] Failed to load reminders:", e);
    activeReminders = new Map();
  }
}

function saveReminders() {
  try {
    // Convert Map values to Array for JSON storage
    const list = Array.from(activeReminders.values());
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(list, null, 2));
  } catch (e) {
    console.error("[remind.js] Failed to save reminders:", e);
  }
}

function scheduleReminder(reminder) {
    const delay = reminder.fireAt - Date.now();
    if (delay <= 0) return;

    setTimeout(() => {
        if (global.api) {
            global.api.sendMessage(
                `⏰ **REMINDER**\n━━━━━━━━━━━━\n"${reminder.message}"\n\n⏱️ Set ${Math.round((Date.now() - reminder.setAt) / 60000)} minutes ago.`,
                reminder.userId
            );
        }
        // ✅ O(1) Deletion
        activeReminders.delete(reminder.id);
        saveReminders();
    }, delay);
}

module.exports.config = {
  name: "remind",
  author: "Sethdico (Optimized)",
  version: "2.1-O(1)",
  category: "Utility",
  description: "Set reminders (s/m/h/d)",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;

  // --- LIST ---
  if (args[0]?.toLowerCase() === "list") {
    // Filter logic is still O(N) because we must find user specific ones, 
    // but this is triggered by user command, not system loop.
    const userReminders = Array.from(activeReminders.values()).filter((r) => r.userId === senderID);
    
    if (userReminders.length === 0) {
      return api.sendMessage("📝 You have no active reminders.", senderID);
    }

    let msg = `📝 **YOUR REMINDERS** (${userReminders.length})\n━━━━━━━━━━━━━━━━\n`;
    userReminders.forEach((r, idx) => {
      const remaining = Math.max(0, r.fireAt - Date.now());
      const minutes = Math.round(remaining / 60000);
      const hours = Math.round(remaining / 3600000);
      const timeStr = hours > 1 ? `${hours}h` : `${minutes}m`;
      msg += `${idx + 1}. "${r.message}" - in ${timeStr}\n`;
    });
    msg += `━━━━━━━━━━━━━━━━`;
    return api.sendMessage(msg, senderID);
  }

  // --- CLEAR ---
  if (args[0]?.toLowerCase() === "clear" || args[0]?.toLowerCase() === "cancel") {
    const keysToDelete = [];
    
    // Identify keys
    for (const [key, val] of activeReminders) {
        if (val.userId === senderID) keysToDelete.push(key);
    }

    if (keysToDelete.length === 0) {
      return api.sendMessage("ℹ️ You have no reminders to clear.", senderID);
    }

    // Delete keys O(1) per key
    keysToDelete.forEach(key => activeReminders.delete(key));
    saveReminders();

    return api.sendMessage(`✅ Cleared ${keysToDelete.length} reminder(s).`, senderID);
  }

  // --- SET REMINDER ---
  const input = args.join(" ");
  const match = input.match(/^(\d+)([smhd])\s+(.+)$/);
  
  if (!match) {
    return api.sendMessage(
      "⚠️ **Usage:**\n• remind 10m Check oven\n• remind 2h Call mom\n• remind 1d Pay bills\n\n(s=sec, m=min, h=hour, d=day)",
      senderID,
    );
  }

  const value = Number.parseInt(match[1]);
  const unit = match[2];
  const message = match[3];

  let delay = 0;
  let unitName = "";

  if (unit === "s") { delay = value * 1000; unitName = "second"; } 
  else if (unit === "m") { delay = value * 60 * 1000; unitName = "minute"; } 
  else if (unit === "h") { delay = value * 60 * 60 * 1000; unitName = "hour"; } 
  else if (unit === "d") { delay = value * 24 * 60 * 60 * 1000; unitName = "day"; }

  if (delay > 30 * 24 * 60 * 60 * 1000) return api.sendMessage("⚠️ Maximum reminder time is 30 days.", senderID);
  if (delay < 1000) return api.sendMessage("⚠️ Minimum reminder time is 1 second.", senderID);

  const reminder = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    userId: senderID,
    message: message,
    setAt: Date.now(),
    fireAt: Date.now() + delay,
    delay: delay,
    unit: unit,
    value: value,
  };

  // ✅ O(1) Insertion
  activeReminders.set(reminder.id, reminder);
  saveReminders();
  scheduleReminder(reminder);

  const pluralUnit = value > 1 ? unitName + "s" : unitName;
  
  api.sendMessage(
    `⏰ **REMINDER SET**\n━━━━━━━━━━━━\n` +
      `📝 Message: "${message}"\n` +
      `⏱️ Time: ${value} ${pluralUnit}\n` +
      `🕐 Will notify at: ${new Date(reminder.fireAt).toLocaleTimeString()}`,
    senderID,
  );
};
