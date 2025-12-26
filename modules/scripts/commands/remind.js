const fs = require('fs').promises;
const path = require("path");

const REMINDERS_FILE = path.join(__dirname, "../../../reminders.json");
const activeReminders = new Map();

// Load reminders on startup
const loadReminders = async () => {
    try {
        const data = await fs.readFile(REMINDERS_FILE, "utf8");
        const list = JSON.parse(data);
        list.forEach(r => {
            if (r.fireAt > Date.now()) {
                activeReminders.set(r.id, r);
                schedule(r);
            }
        });
    } catch (e) { /* File missing or empty is ok */ }
};

// Save reminders (Async)
const saveReminders = async () => {
    try {
        await fs.writeFile(REMINDERS_FILE, JSON.stringify([...activeReminders.values()], null, 2));
    } catch (e) { console.error("Error saving reminders:", e); }
};

function schedule(r) {
  const delay = r.fireAt - Date.now();
  if (delay <= 0) return;
  if (delay > 2147483647) return; 

  const timeoutId = setTimeout(async () => {
    if (global.api) global.api.sendMessage(`⏰ **REMINDER**\n"${r.message}"`, r.userId);
    activeReminders.delete(r.id);
    await saveReminders();
  }, delay);
  
  // Store the timeout ID so we could cancel it if we wanted to (optimization)
  r.timeoutId = timeoutId; 
}

module.exports.config = {
  name: "remind",
  author: "Sethdico",
  version: "2.1",
  category: "Utility",
  description: "Set a reminder.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const input = args.join(" ");

  // LIST
  if (args[0] === "list") {
    const userList = [...activeReminders.values()].filter(r => r.userId === senderID);
    if (!userList.length) return api.sendMessage("📝 No active reminders.", senderID);
    
    let msg = "📝 **YOUR LIST:**\n";
    userList.forEach((r, i) => {
        const left = Math.round((r.fireAt - Date.now()) / 60000);
        msg += `${i+1}. "${r.message}" (in ${left}m)\n`;
    });
    return api.sendMessage(msg, senderID);
  }

  // CLEAR
  if (args[0] === "clear") {
    for (const [id, r] of activeReminders) {
        if (r.userId === senderID) {
            clearTimeout(r.timeoutId); // Prevent ghost execution
            activeReminders.delete(id);
        }
    }
    await saveReminders();
    return api.sendMessage("✅ Cleared all your reminders.", senderID);
  }

  // SET
  const match = input.match(/^(\d+)([smhd])\s+(.+)$/);
  if (!match) return api.sendMessage("⏰ Usage: remind 10m <message>\n(s=sec, m=min, h=hr)", senderID);

  const val = parseInt(match[1]);
  const unit = match[2];
  const text = match[3];

  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const delay = val * multipliers[unit];

  if (delay > 2000000000) return api.sendMessage("⚠️ Max reminder time is ~24 days.", senderID);

  const reminder = {
    id: Date.now() + Math.random().toString(36).slice(2),
    userId: senderID,
    message: text,
    fireAt: Date.now() + delay
  };

  activeReminders.set(reminder.id, reminder);
  await saveReminders();
  schedule(reminder);

  api.sendMessage(`✅ Reminder set for ${val}${unit}: "${text}"`, senderID);
};

// Initialize
loadReminders();
