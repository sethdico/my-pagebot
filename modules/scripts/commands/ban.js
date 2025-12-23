const fs = require("fs");
const path = require("path");
const config = require("../../../config.json");

const bannedPath = path.join(__dirname, "banned.json");

module.exports.config = {
  name: "admin",
  aliases: ["ban", "unban"],
  author: "Sethdico",
  version: "2.0-Optimized",
  category: "Admin",
  description: "Manage users (ban/unban) - O(1) Performance",
  adminOnly: true,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async function ({ event, args, api }) {
  const senderID = event.sender.id;
  const messageText = event.message.text.toLowerCase();

  // Check Permissions
  const adminList = config.ADMINS || config.ADMIN || [];
  if (!adminList.includes(senderID)) {
    return api.sendMessage("❌ Restricted: Admin access only.", senderID);
  }

  // Ensure global set exists (safety check)
  if (!global.BANNED_USERS) global.BANNED_USERS = new Set();

  if (messageText.startsWith("ban")) {
    const target = args[0];
    if (!target) return api.sendMessage("⚠️ Usage: ban <ID>", senderID);
    if (adminList.includes(target)) {
      return api.sendMessage("❌ You cannot ban an admin.", senderID);
    }

    // ✅ O(1) Check and Insert
    if (!global.BANNED_USERS.has(target)) {
      global.BANNED_USERS.add(target);
      
      // Async save (Non-blocking)
      saveBannedList();
      
      api.sendMessage(`🚫 User ${target} has been banned.`, senderID);
    } else {
      api.sendMessage("ℹ️ User is already banned.", senderID);
    }

  } else if (messageText.startsWith("unban")) {
    const target = args[0];
    if (!target) return api.sendMessage("⚠️ Usage: unban <ID>", senderID);

    // ✅ O(1) Check and Delete
    if (global.BANNED_USERS.has(target)) {
      global.BANNED_USERS.delete(target);
      
      // Async save (Non-blocking)
      saveBannedList();
      
      api.sendMessage(`✅ User ${target} has been unbanned.`, senderID);
    } else {
      api.sendMessage("⚠️ User is not in the ban list.", senderID);
    }

  } else if (args[0] === "list") {
    // Convert Set to Array for display
    const list = Array.from(global.BANNED_USERS);
    api.sendMessage(
      `🚫 **Banned List:**\n${list.join("\n") || "No banned users."}`,
      senderID
    );
  }
};

// Helper to save file asynchronously
function saveBannedList() {
    const data = JSON.stringify(Array.from(global.BANNED_USERS), null, 2);
    fs.writeFile(bannedPath, data, (err) => {
        if (err) console.error("❌ Failed to save banned list to disk:", err);
    });
}
