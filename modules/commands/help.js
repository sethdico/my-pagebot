module.exports.config = {
  name: "help", 
  author: "Sethdico", 
  version: "21.0", 
  category: "Utility", 
  description: "command list", 
  adminOnly: false, 
  usePrefix: false, 
  cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();
  const isAdmin = global.ADMINS.has(event.sender.id);

  // specific command info
  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) {
        if (cmd.config.category === "Admin" && !isAdmin) return; 
        return reply(`${cmd.config.name}\n${cmd.config.description || 'no description'}`);
    }
    return reply(`command "${input}" not found`);
  }

  // build command list
  const cats = ["AI", "FUN", "UTILITY"];
  if (isAdmin) cats.push("ADMIN");

  const sorted = {};
  cats.forEach(c => sorted[c] = []);
  
  for (const [name, cmd] of global.client.commands) {
      const cat = cmd.config.category?.toUpperCase();
      if (sorted[cat]) sorted[cat].push(name);
  }

  let msg = "commands\n\n";
  cats.forEach(c => {
      if (sorted[c].length > 0) {
          msg += `${c.toLowerCase()}\n${sorted[c].sort().join(", ")}\n\n`;
      }
  });
  
  msg += `type: help <command> for info`;
  return reply(msg);
};
