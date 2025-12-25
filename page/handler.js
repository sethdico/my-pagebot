const config = require("../config.json");
const userSpam = new Map(); // Store message timestamps

module.exports = async function (event) {
  const api = global.api;
  const senderID = event.sender.id;
  const reply = (text) => api.sendMessage(text, senderID);

  // 1. GLOBAL ANTI-SPAM
  const now = Date.now();
  const userData = userSpam.get(senderID) || { count: 0, lastMsg: 0, locked: false };

  if (userData.locked && now < userData.locked) return; // User is currently ignored
  
  if (now - userData.lastMsg < 1000) { // Less than 1 second since last message
    userData.count++;
    if (userData.count > 5) { // 5 fast messages in a row
        userData.locked = now + 30000; // Lock for 30 seconds
        userSpam.set(senderID, userData);
        return reply("⚠️ **STOP SPAMMING**\nYou are sending messages too fast. I will ignore you for 30 seconds.");
    }
  } else {
    userData.count = 0; // Reset count if they slowed down
  }
  userData.lastMsg = now;
  userSpam.set(senderID, userData);

  // 2. Handle Welcome
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
    const userInfo = await api.getUserInfo(senderID);
    return reply(`👋 Hi ${userInfo.first_name || "User"}! Type help to start.`);
  }

  if (event.message?.is_echo) return;

  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  if (!messageText && !event.message?.attachments) return;

  const args = messageText.split(" ");
  let cmdName = args.shift().toLowerCase();
  
  if (cmdName.startsWith(config.PREFIX)) {
      cmdName = cmdName.slice(config.PREFIX.length);
  }

  let command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

  if (command) {
      if (command.config.adminOnly && !global.ADMINS.has(senderID)) {
          return reply("⛔ Admin only.");
      }

      try {
          await command.run({ event, args, api, reply });
      } catch (e) { 
          console.error(`Crash in ${cmdName}:`, e.message);
          reply("❌ Command failed.");
      }
  } else {
      if (!messageText.startsWith(config.PREFIX)) {
          const aiCommand = global.client.commands.get("ai");
          if (aiCommand) await aiCommand.run({ event, args: messageText.split(" "), api, reply });
      }
  }
};
