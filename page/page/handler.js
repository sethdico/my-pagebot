const fs = require("fs");
const path = require("path");
const config = require("../config.json");

module.exports = async function (event) {
  const modulesPath = path.join(__dirname, "../modules/scripts/commands");
  
  // Ensure commands folder exists
  if (!fs.existsSync(modulesPath)) return;

  const commandFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith(".js"));
  
  // Mark as seen
  if (config.markAsSeen) api.markAsSeen(true, event.sender.id).catch(()=>{});

  const messageText = event.message?.text || "";
  const [rawCmd, ...args] = messageText.split(" ");
  
  // Loop commands
  for (const file of commandFiles) {
    const command = require(path.join(modulesPath, file));
    let cmdName = rawCmd.toLowerCase();
    
    if (command.config.usePrefix) {
        if (!cmdName.startsWith(config.PREFIX)) continue;
        cmdName = cmdName.slice(config.PREFIX.length);
    }
    
    if (cmdName === command.config.name.toLowerCase()) {
        try {
            await command.run({ event, args });
        } catch (e) { console.error(e); }
    }
  }
};
