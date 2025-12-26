const fs = require("fs");
const path = require("path");

const REMINDERS_FILE = path.join(__dirname, "../../../reminders.json");
const activeReminders = new Map();

// Load reminders
try {
  if (fs.existsSync(REMINDERS_FILE)) {
    const data = JSON.parse(fs.readFileSync(REMINDERS_FILE, "utf8"));
    data.forEach(r => {
      if (r.fireAt > Date.now()) {
        activeReminders.set(r.id, r);
        schedule(r);
      }
    });
  }
} catch (e) { console.log("⚠️ No reminders loaded."); }

function save() {
  fs.writeFileSync(REMINDERS_FILE, JSON.stringify(Array.from(activeReminders.values()), null, 2));
}

function schedule(r) {
  const delay = r.fireAt - Date.now();
  if (delay <= 0) return;
  
  // OPTIMIZATION: Check for Integer Overflow (Max setTimeout is ~24 days)
  if (delay > 2147483647) return; 

  setTimeout(() => {
    // Uses global.api as fallback because this runs in the future
    if (global.api) global.api.sendMessage(`⏰ **REMINDER**\n"${r.message}"`, r.userId);
    activeReminders.delete(r.id);
    save();
  }, delay);
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
    const userList = Array.from(activeReminders.values()).filter(r => r.userId === senderID);
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
        if (r.userId === senderID) activeReminders.delete(id);
    }
    save();
    return api.sendMessage("✅ Cleared all your reminders.", senderID);
  }

  // SET
  const match = input.match(/^(\d+)([smhd])\s+(.+)$/);
  if (!match) return api.sendMessage("⏰ Usage: remind 10m <message>\n(s=sec, m=min, h=hr)", senderID);

  const val = parseInt(match[1]);
  const unit = match[2];
  const text = match[3];

  let mult = 1000;
  if (unit === "m") mult *= 60;
  if (unit === "h") mult *= 3600;
  if (unit === "d") mult *= 86400;

  const delay = val * mult;
  
  // Safety cap to prevent server crash (approx 24 days)
  if (delay > 2000000000) return api.sendMessage("⚠️ Max reminder time is ~24 days.", senderID);

  const reminder = {
    id: Date.now() + Math.random().toString(36).slice(2),
    userId: senderID,
    message: text,
    fireAt: Date.now() + delay
  };

  activeReminders.set(reminder.id, reminder);
  save();
  schedule(reminder);

  api.sendMessage(`✅ Reminder set for ${val}${unit}: "${text}"`, senderID);
};
