const db = require("../../../modules/database");

module.exports.config = {
  name: "admin", aliases: ["ban", "unban"], author: "Sethdico", version: "2.1", category: "Admin", description: "manage users.", adminOnly: true, usePrefix: false, cooldown: 0
};

module.exports.run = async function ({ event, args, reply }) {
  const senderID = event.sender.id;
  const cmd = event.message.text.toLowerCase().split(" ")[0];

  if (!global.ADMINS.has(senderID)) return reply("❌ restricted.");

  if (cmd === "ban") {
    const target = args[0];
    if (!target) return reply("⚠️ usage: ban <id>");
    global.BANNED_USERS.add(target);
    db.addBan(target);
    reply(`🚫 banned ${target}`);
  } else if (cmd === "unban") {
    const target = args[0];
    if (global.BANNED_USERS.has(target)) {
      global.BANNED_USERS.delete(target);
      db.removeBan(target);
      reply(`✅ unbanned ${target}`);
    }
  } else if (args[0] === "list") {
    reply(`🚫 **banned:**\n${Array.from(global.BANNED_USERS).join("\n") || "none"}`);
  }
};
