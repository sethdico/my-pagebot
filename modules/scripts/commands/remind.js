const db = require("../../../modules/database");
const activeReminders = new Map();

const loadReminders = () => {
    db.getActiveReminders((list) => {
        list.forEach(r => {
            if (r.fireAt > Date.now()) {
                activeReminders.set(r.id, r);
                const delay = r.fireAt - Date.now();
                if (delay > 0 && delay < 2147483647) {
                    r.timeoutId = setTimeout(() => {
                        // Use global.api fallback if needed, or inject api later
                        // For this implementation, we assume api is passed or global
                        // Ideally, we inject api, but for reminders we might need global access
                        // Let's rely on main.js passing 'api' implicitly or check global
                        if (global.api) global.api.sendMessage(`⏰ **REMINDER**\n"${r.message}"`, r.userId);
                        activeReminders.delete(r.id);
                    }, delay);
                }
            }
        });
    });
};

module.exports.config = { name: "remind", author: "Sethdico", version: "2.1", category: "Utility", description: "Set a reminder.", adminOnly: false, usePrefix: false, cooldown: 3 };

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  // Inject api into global for the reminder timeout callback (Simple workaround)
  global.api = api; 

  const input = args.join(" ");
  if (args[0] === "list") {
    const list = [...activeReminders.values()].filter(r => r.userId === senderID);
    return api.sendMessage(list.length ? list.map((r,i)=>`${i+1}. ${r.message}`).join("\n") : "📝 Empty", senderID);
  }
  if (args[0] === "clear") {
    [...activeReminders.keys()].filter(k => activeReminders.get(k).userId === senderID).forEach(k => {
        clearTimeout(activeReminders.get(k).timeoutId);
        activeReminders.delete(k);
    });
    return api.sendMessage("✅ Cleared.", senderID);
  }
  const match = input.match(/^(\d+)([smhd])\s+(.+)$/);
  if (!match) return api.sendMessage("⏰ Usage: remind 10m <msg>", senderID);
  
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const reminder = {
    id: Date.now() + Math.random().toString(36).slice(2),
    userId: senderID,
    message: match[3],
    fireAt: Date.now() + (parseInt(match[1]) * units[match[2]])
  };

  activeReminders.set(reminder.id, reminder);
  db.addReminder(reminder);
  
  const delay = reminder.fireAt - Date.now();
  if (delay > 0 && delay < 2147483647) {
      reminder.timeoutId = setTimeout(() => {
          if (global.api) global.api.sendMessage(`⏰ **REMINDER**\n"${reminder.message}"`, reminder.userId);
          activeReminders.delete(reminder.id);
      }, delay);
  }

  api.sendMessage(`✅ Reminder set.`, senderID);
};

loadReminders();
