const fs = require("fs");
const path = require("path");
const config = require("../../../config.json");

const bannedPath = path.join(__dirname, "banned.json");

module.exports.config = {
  name: "admin",
  aliases: ["ban", "unban"],
  author: "Sethdico",
  version: "1.2",
  category: "Admin",
  description: "Manage users (ban/unban)",
  adminOnly: true,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const messageText = event.message.text.toLowerCase();

  // Ensure only real admins can use this
  if (!config.ADMINS.includes(senderID)) {
    return api.sendMessage("❌ Restricted: Admin access only.", senderID);
  }

  // Auto-create banned.json if missing
  if (!fs.existsSync(bannedPath)) fs.writeFileSync(bannedPath, "[]");
  let bannedUsers = JSON.parse(fs.readFileSync(bannedPath));

  // Handle "ban" command
  if (messageText.startsWith("ban")) {
    const target = args[0]; // If using alias 'ban', the ID is the first arg
    if (!target) return api.sendMessage("⚠️ Usage: ban <ID>", senderID);
    if (config.ADMINS.includes(target)) return api.sendMessage("❌ You cannot ban an admin.", senderID);

    if (!bannedUsers.includes(target)) {
      bannedUsers.push(target);
      fs.writeFileSync(bannedPath, JSON.stringify(bannedUsers, null, 2));
      api.sendMessage(`🚫 User ${target} has been banned.`, senderID);
    } else {
      api.sendMessage("ℹ️ User is already banned.", senderID);
    }
  } else if (messageText.startsWith("unban")) {
    // Handle "unban" command
    const target = args[0];
    if (!target) return api.sendMessage("⚠️ Usage: unban <ID>", senderID);

    const index = bannedUsers.indexOf(target);
    if (index > -1) {
      bannedUsers.splice(index, 1);
      fs.writeFileSync(bannedPath, JSON.stringify(bannedUsers, null, 2));
      api.sendMessage(`✅ User ${target} has been unbanned.`, senderID);
    } else {
      api.sendMessage("⚠️ User is not in the ban list.", senderID);
    }
  } else if (args[0] === "list") {
    // Handle "admin list"
    api.sendMessage(
      `🚫 **Banned List:**\n${bannedUsers.join("\n") || "No banned users."}`,
      senderID
    );
  }
};
