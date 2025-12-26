const db = require("../../../database");
const activeReminders = new Map();

// FIX: Require the API directly so it works on startup
// Note: We use a getter or deferred require if circular dependency is a risk, 
// but here it is safe because main.js exports 'api' independently.
let api;
try {
    api = require("../../../../page/main").api;
} catch (e) {
    console.warn("API not ready for reminders yet.");
}

const loadReminders = () => {
    db.getActiveReminders((list) => {
        list.forEach(r => {
            if (r.fireAt > Date.now()) {
                activeReminders.set(r.id, r);
                const delay = r.fireAt - Date.now();
                if (delay > 0 && delay < 2147483647) {
                    r.timeoutId = setTimeout(() => {
                        // FIX: Use the imported api object
                        if (api) api.sendMessage(`⏰ **REMINDER**\n"${r.message}"`, r.userId);
                        activeReminders.delete(r.id);
                        db.deleteReminder(r.id); // Optional: cleanup DB
                    }, delay);
                }
            }
        });
    });
};

module.exports.config = { name: "remind", author: "Sethdico", version: "2.2", category: "Utility", description: "Set a reminder.", adminOnly: false, usePrefix: false, cooldown: 3 };

module.exports.run = async ({ event, args, api: commandApi }) => {
  // Update local api reference if command runs (just in case)
  if (!api) api = commandApi;
  
  const senderID = event.sender.id;
  const input = args.join(" ");

  if (args[0] === "list") {
    const list = [...activeReminders.values()].filter(r => r.userId === senderID);
    return commandApi.sendMessage(list.length ? list.map((r,i)=>`${i+1}. ${r.message}`).join("\n") : "📝 Empty", senderID);
  }
  
  if (args[0] === "clear") {
    [...activeReminders.values()].filter(r => r.userId === senderID).forEach(r => {
        clearTimeout(r.timeoutId);
        activeReminders.delete(r.id);
        db.deleteReminder(r.id);
    });
    return commandApi.sendMessage("✅ Cleared.", senderID);
  }

  const match = input.match(/^(\d+)([smhd])\s+(.+)$/);
  if (!match) return commandApi.sendMessage("⏰ Usage: remind 10m <msg>", senderID);
  
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
          if (api) api.sendMessage(`⏰ **REMINDER**\n"${reminder.message}"`, reminder.userId);
          activeReminders.delete(reminder.id);
          db.deleteReminder(reminder.id);
      }, delay);
  }

  commandApi.sendMessage(`✅ Reminder set.`, senderID);
};

// Start the listener
loadReminders();
