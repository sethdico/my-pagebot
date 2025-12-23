const config = require("../config.json");

module.exports = async function (event) {
  const api = global.api;
  const senderID = event.sender.id;

  // --- 👋 PERSONALIZED WELCOME (GET STARTED) ---
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
      try {
          // Fetch User Name
          const userInfo = await api.getUserInfo(senderID);
          const name = userInfo.first_name || "Friend";

          const msg = `👋 **Hi ${name}! Welcome to Amdusbot.**\n\nI am your AI assistant. You can ask me questions, generate art, or search Wikipedia!\n\n💡 Type \`help\` to see what I can do.`;
          
          // Use Quick Replies for easy start
          if (api.sendQuickReply) {
              return api.sendQuickReply(msg, ["Help", "AI", "Wiki Random"], senderID);
          } else {
              return api.sendMessage(msg, senderID);
          }
      } catch (e) {
          return api.sendMessage("👋 **Welcome to Amdusbot!**\nType `help` to start.", senderID);
      }
  }

  // --- STANDARD COMMAND HANDLING ---
  if (event.message?.is_echo) return;

  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  if (!messageText && !event.message?.attachments) return;

  // Parse Args
  const args = messageText.split(" ");
  let cmdName = args.shift().toLowerCase();
  
  if (cmdName.startsWith(config.PREFIX)) {
      cmdName = cmdName.slice(config.PREFIX.length);
  }

  // Find Command
  let command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

  if (command) {
      // Permission Check
      const adminList = config.ADMINS || config.ADMIN || [];
      if (command.config.adminOnly && !adminList.includes(senderID)) {
          return api.sendMessage("⛔ Permission Denied.", senderID);
      }

      // Cooldown Check
      if (!global.client.cooldowns.has(command.config.name)) {
          global.client.cooldowns.set(command.config.name, new Map());
      }
      const now = Date.now();
      const timestamps = global.client.cooldowns.get(command.config.name);
      const cooldownAmount = (command.config.cooldown || 0) * 1000;

      if (timestamps.has(senderID)) {
          const expiration = timestamps.get(senderID) + cooldownAmount;
          if (now < expiration) {
              return; // Silent ignore on cooldown
          }
      }
      timestamps.set(senderID, now);
      setTimeout(() => timestamps.delete(senderID), cooldownAmount);

      // Execute
      try {
          await command.run({ event, args, api });
      } catch (e) { 
          console.error(`Crash in ${cmdName}:`, e.message);
          api.sendMessage("❌ Error executing command.", senderID);
      }
  } else {
      // AI Fallback (No prefix needed)
      if (!messageText.startsWith(config.PREFIX)) {
          const aiCommand = global.client.commands.get("ai");
          if (aiCommand) await aiCommand.run({ event, args: messageText.split(" "), api });
      }
  }
};
