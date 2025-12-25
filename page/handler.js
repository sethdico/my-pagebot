const config = require("../config.json");

module.exports = async function (event) {
  const api = global.api;
  const senderID = event.sender.id;

  // 1. Create a "Reply" shortcut helper
  const reply = (text) => api.sendMessage(text, senderID);

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
      // ✅ OPTIMIZED: Permission Check using the Global Set
      if (command.config.adminOnly && !global.ADMINS.has(senderID)) {
          return reply("⛔ Admin only.");
      }

      // Execute with the new 'reply' helper
      try {
          await command.run({ event, args, api, reply });
      } catch (e) { 
          console.error(`Crash in ${cmdName}:`, e.message);
          reply("❌ Command failed.");
      }
  } else {
      // AI Fallback (If no prefix used)
      if (!messageText.startsWith(config.PREFIX)) {
          const aiCommand = global.client.commands.get("ai");
          if (aiCommand) await aiCommand.run({ event, args: messageText.split(" "), api, reply });
      }
  }
};
