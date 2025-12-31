const db = require("../core/database");
const crypto = require("crypto");

const loadReminders = () => {
    db.getActiveReminders((list) => {
        list.forEach(r => {
            const delay = new Date(r.fireAt).getTime() - Date.now();
            if (delay > 0 && delay < 2147483647) {
                setTimeout(async () => {
                    if (global.api) {
                        global.api.sendMessage(`⏰ **REMINDER**\n"${r.message}"`, r.userId);
                        await db.deleteReminder(r.id);
                    }
                }, delay);
            }
        });
    });
};

module.exports.config = { 
    name: "remind", author: "Sethdico", version: "2.7", category: "Utility", description: "Set a reminder.", adminOnly: false, usePrefix: false, cooldown: 3 
};

module.exports.run = async ({ event, args, api, reply }) => {
    const senderID = event.sender.id;
    const input = args.join(" ");

    if (args[0] === "list") {
        const list = await new Promise(resolve => db.getActiveReminders(resolve));
        const userList = list.filter(r => r.userId === senderID);
        return reply(userList.length ? userList.map((r,i)=>`${i+1}. ${r.message}`).join("\n") : "📝 No active reminders.");
    }

    if (args[0] === "cancel") {
        const num = parseInt(args[1]);
        if (!num) return reply("⚠️ Usage: remind cancel <number>");
        const list = await new Promise(resolve => db.getActiveReminders(resolve));
        const toCancel = list.filter(r => r.userId === senderID)[num - 1];
        if (toCancel) {
            await db.deleteReminder(toCancel.id);
            return reply("✅ reminder cancelled");
        }
        return reply("❌ reminder not found");
    }

    const match = input.match(/^(\d+)([smhd])\s+(.+)$/);
    if (!match) return reply("⏰ Usage: remind 10m <msg>");
    
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const delay = parseInt(match[1]) * units[match[2]];

    if (delay > 2147483647) return reply("⚠️ max reminder: 24 days");

    const reminder = {
        id: crypto.randomBytes(8).toString('hex'),
        userId: senderID,
        message: match[3],
        fireAt: Date.now() + delay
    };

    await db.addReminder(reminder);
    
    setTimeout(async () => {
        api.sendMessage(`⏰ **REMINDER**\n"${reminder.message}"`, senderID);
        await db.deleteReminder(reminder.id);
    }, delay);

    reply(`✅ Reminder set for ${match[1]}${match[2]}.`);
};
loadReminders();
