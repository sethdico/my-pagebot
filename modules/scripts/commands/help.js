module.exports.config = {
  name: "help", author: "Sethdico", version: "20.0", category: "Utility", description: "Clean command menu.", adminOnly: false, usePrefix: false, cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();
  const isAdmin = global.ADMINS.has(event.sender.id);

  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) {
        if (cmd.config.category === "Admin" && !isAdmin) return; 
        return reply(`🤖 **${cmd.config.name.toUpperCase()}**\n━━━━━━━━━━━━━━━━\nInfo: ${cmd.config.description}`);
    }
  }

  const cats = ["AI", "FUN", "UTILITY"];
  if (isAdmin) cats.push("ADMIN");

  const structure = {};
  cats.forEach(c => structure[c] = []);
  for (const [name, cmd] of global.client.commands) {
      const c = cmd.config.category?.toUpperCase();
      if (structure[c]) structure[c].push(name);
  }

  let fullMsg = `🤖 **COMMAND MENU**\n━━━━━━━━━━━━━━━━\n`;
  cats.forEach(c => {
      if (structure[c].length > 0) fullMsg += `📁 ${c}: ${structure[c].sort().join(", ")}\n\n`;
  });
  
  fullMsg += `Type a category name or 'help <cmd>' for details.`;
  return reply(fullMsg);
};
