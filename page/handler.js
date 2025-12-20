const fs = require("fs");
const path = require("path");
const config = require("../config.json");

module.exports = async function (event) {
  const modulesPath = path.join(__dirname, "../modules/scripts/commands");
  const commandFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith(".js"));
  
  if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
      return api.sendMessage("👋 **Welcome to Amdusbot!**\nTalk to me naturally or type `help` for commands!", event.sender.id);
  }

  if (event.message?.is_echo) return;
  if (config.markAsSeen) api.markAsSeen(true, event.sender.id).catch(()=>{});

  // --- 🛠️ FIX: Detect button clicks (payload) as if they were typed messages ---
  const messageText = (event.message?.text || event.postback?.payload || "").trim();
  
  if (!messageText && !event.message?.attachments) return;

  const [rawCmd, ...args] = messageText.split(" ");
  let cmdName = rawCmd.toLowerCase();
  let commandFound = false;

  // Aliases
  if (cmdName === "imge" || cmdName === "generate") cmdName = "deepimg";
  if (cmdName === "search") cmdName = "webpilot";

  for (const file of commandFiles) {
    const command = require(path.join(modulesPath, file));
    let checkName = cmdName;
    if (command.config.usePrefix) {
        if (!checkName.startsWith(config.PREFIX)) continue;
        checkName = checkName.slice(config.PREFIX.length);
    }

    if (checkName === command.config.name.toLowerCase()) {
        commandFound = true;
        if (command.config.adminOnly && !config.ADMINS.includes(event.sender.id)) return api.sendMessage("🔒 Admin only.", event.sender.id);
        
        try {
            await command.run({ event, args });
        } catch (e) { 
            if (config.ADMINS.includes(event.sender.id)) api.sendMessage(`⚠️ Crash: ${e.message}`, event.sender.id);
        }
        break;
    }
  }

  if (!commandFound && !messageText.startsWith(config.PREFIX) && (messageText || event.message?.attachments)) {
      try {
          const aiCommand = require(path.join(modulesPath, "ai.js"));
          await aiCommand.run({ event, args: messageText.split(" ") });
      } catch (e) {}
  }
};
