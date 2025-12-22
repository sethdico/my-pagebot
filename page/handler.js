const config = require("../config.json");

module.exports = async function (event) {
  const api = global.api;
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
      return api.sendMessage("👋 **Welcome to Amdusbot!**\nI'm a Multi-AI assistant. Talk to me naturally or type `help`!", event.sender.id);
  }

  if (event.message?.is_echo) return;

  const senderID = event.sender.id;
  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  if (!messageText && !event.message?.attachments) return;

  const args = messageText.split(" ");
  let cmdName = args.shift().toLowerCase();
  if (cmdName.startsWith(config.PREFIX)) {
      cmdName = cmdName.slice(config.PREFIX.length);
  }

  let command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

  if (command) {
      const adminList = config.ADMINS || config.ADMIN || [];
      if (command.config.adminOnly && !adminList.includes(senderID)) {
          return api.sendMessage("⛔ Permission Denied: This command is for Admins only.", senderID);
      }
      try {
          await command.run({ event, args, api });
      } catch (e) { 
          console.error(`Crash in ${cmdName}:`, e.message);
          api.sendMessage("❌ Command error. Please try again.", senderID);
      }
  } else {
      if (!messageText.startsWith(config.PREFIX)) {
          const aiCommand = global.client.commands.get("ai");
          if (aiCommand) await aiCommand.run({ event, args: messageText.split(" "), api });
      }
  }
};
