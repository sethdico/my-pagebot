const fs = require("fs");
const path = require("path");
const config = require("../config.json");

// --- 🛡️ V2 Feature: GLOBAL RATE LIMITER ---
const rateLimitStore = new Map();
const RATE_LIMIT = { requests: 10, windowMs: 60000 }; // 10 messages per minute per user

module.exports = async function (event) {
  const modulesPath = path.join(__dirname, "../modules/scripts/commands");
  const commandFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith(".js"));
  
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
      return api.sendMessage("👋 **Welcome to Amdusbot!**\nI'm a Multi-AI assistant. Talk to me naturally or type `help`!", event.sender.id);
  }

  if (event.message?.is_echo) return;

  const senderID = event.sender.id;

  // --- 🛡️ RATE LIMIT CHECK ---
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < RATE_LIMIT.windowMs);
  
  if (recentTs.length >= RATE_LIMIT.requests) {
    // Optional: Warn them once
    if (recentTs.length === RATE_LIMIT.requests) {
        api.sendMessage("⏳ You are sending messages too fast. Please slow down.", senderID);
    }
    return; // Stop processing
  }
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // Normal Logic
  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  if (!messageText && !event.message?.attachments) return;

  const [rawCmd, ...args] = messageText.split(" ");
  let cmdName = rawCmd.toLowerCase();
  let commandFound = false;

  // --- 🧹 CLEANED: No Hardcoded Aliases ---
  // The 'draw', 'generate', and 'search' overrides are REMOVED.
  // This allows the main AI (ai.js) to detect "draw" and switch to Creative Mode automatically.

  for (const file of commandFiles) {
    const command = require(path.join(modulesPath, file));
    let checkName = cmdName;
    if (command.config.usePrefix && checkName.startsWith(config.PREFIX)) {
        checkName = checkName.slice(config.PREFIX.length);
    }

    if (checkName === command.config.name.toLowerCase()) {
        commandFound = true;
        try {
            await command.run({ event, args });
        } catch (e) { 
            console.error(`Crash in ${cmdName}:`, e.message); 
            api.sendMessage("❌ Command error. Please try again.", senderID);
        }
        break;
    }
  }

  // Auto-AI Fallback
  // If the user typed something that isn't a command (like "draw a cat"), 
  // it falls through to here, where ai.js picks it up.
  if (!commandFound && !messageText.startsWith(config.PREFIX) && (messageText || event.message?.attachments)) {
      try {
          const aiCommand = require(path.join(modulesPath, "ai.js"));
          await aiCommand.run({ event, args: messageText.split(" ") });
      } catch (e) {
          console.error("Auto-AI Error:", e.message);
      }
  }
};
