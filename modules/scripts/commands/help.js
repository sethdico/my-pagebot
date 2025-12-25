let helpCache = null;

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "12.3",
  category: "Utility",
  description: "view commands.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, reply }) => {
  const input = args[0]?.toLowerCase();

  if (input && input !== "admin") {
    const cmdName = global.client.commands.has(input) ? input : global.client.aliases.get(input);
    if (cmdName) {
      const cmd = global.client.commands.get(cmdName).config;
      return reply(`🤖 **${cmd.name}**\n───────────────\ninfo: ${cmd.description}\nusage: ${cmd.name}`);
    }
  }

  if (!helpCache) {
    const categories = {};
    for (const [name, cmd] of global.client.commands) {
      const cat = cmd.config.category || "General";
      if (cat.toLowerCase() === "admin") continue;
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(name);
    }
    let menu = `🤖 **menu**\n───────────────\n`;
    Object.keys(categories).sort().forEach(cat => {
      menu += `📁 **${cat.toUpperCase()}**\n[ ${categories[cat].sort().join(", ")} ]\n\n`;
    });
    menu += `───────────────\n💡 help [command] for info.`;
    helpCache = menu;
  }

  if (input === "admin") {
    if (!global.ADMINS.has(event.sender.id)) return reply("⛔ admin only.");
    return reply(`🔐 **admin**\n[ stats, ban, unban, broadcast ]`);
  }

  reply(helpCache);
};
