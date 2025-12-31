const db = require("../../../modules/database");

module.exports.config = {
  name: "ban", 
  aliases: ["unban", "banlist"], 
  author: "Sethdico", 
  version: "2.2", 
  category: "Admin", 
  description: "manage users.", 
  adminOnly: true, 
  usePrefix: false, 
  cooldown: 0
};

module.exports.run = async function ({ event, args, reply }) {
  const senderID = event.sender.id;
  const cmd = event.message.text.toLowerCase().split(" ")[0];

  if (!global.ADMINS.has(senderID)) return reply("❌ restricted.");

  if (cmd === "ban") {
    const target = args[0];
    const reason = args.slice(1).join(" ") || "no reason provided";
    if (!target) return reply("⚠️ usage: ban <id> [reason]");
    global.BANNED_USERS.add(target);
    db.addBan(target, reason);
    reply(`🚫 banned ${target}\nReason: ${reason}`);
  } 
  
  else if (cmd === "unban") {
    const target = args[0];
    if (!target) return reply("⚠️ usage: unban <id>");
    if (global.BANNED_USERS.has(target)) {
      global.BANNED_USERS.delete(target);
      db.removeBan(target);
      reply(`✅ unbanned ${target}`);
    } else {
      reply("⚠️ user not banned");
    }
  } 
  
  else if (cmd === "banlist" || args[0] === "list") {
    if (global.BANNED_USERS.size === 0) return reply("✅ no banned users");
    reply(`🚫 **Banned Users (${global.BANNED_USERS.size}):**\n────────────────\n${Array.from(global.BANNED_USERS).join("\n")}`);
  }
};
