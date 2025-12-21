const path = require("path");
const config = require("../config.json");

const rateLimitStore = new Map();
const RATE_LIMIT = { requests: 10, windowMs: 60000 }; 

module.exports = async function (event) {
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
      return api.sendMessage("👋 **Welcome to Amdusbot!**\nI'm a Multi-AI assistant. Talk to me naturally or type `help`!", event.sender.id);
  }

  if (event.message?.is_echo) return;

  const senderID = event.sender.id;

  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < RATE_LIMIT.windowMs);
  
  if (recentTs.length >= RATE_LIMIT.requests) {
    if (recentTs.length === RATE_LIMIT.requests) {
        api.sendMessage("⏳ You are sending messages too fast. Please slow down.", senderID);
    }
    return;
  }
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  if (!messageText && !event.message?.attachments) return;

  const args = messageText.split(" ");
  let cmdName = args.shift().toLowerCase();

  if (cmdName.startsWith(config.PREFIX)) {
      cmdName = cmdName.slice(config.PREFIX.length);
  }

  let command = global.client.commands.get(cmdName);
  
  if (!command && global.client.aliases.has(cmdName)) {
      const actualName = global.client.aliases.get(cmdName);
      command = global.client.commands.get(actualName);
  }

  if (command) {
      try {
          await command.run({ event, args });
      } catch (e) { 
          console.error(`Crash in ${cmdName}:`, e.message); 
          api.sendMessage("❌ Command error. Please try again.", senderID);
      }
  } else {
      if (!messageText.startsWith(config.PREFIX) && (messageText || event.message?.attachments)) {
          try {
              const aiCommand = global.client.commands.get("ai"); 
              if (aiCommand) await aiCommand.run({ event, args: messageText.split(" ") });
          } catch (e) {
              console.error("Auto-AI Error:", e.message);
          }
      }
  }
};
