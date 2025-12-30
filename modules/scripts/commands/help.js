module.exports.config = {
  name: "help", author: "Sethdico", version: "13.0", category: "Utility", description: "Interactive help menu.", adminOnly: false, usePrefix: false, cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();

  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) return reply(`🤖 **${cmd.config.name}**\n${cmd.config.description}`);
  }

  const menu = `🤖 **COMMANDS**\n━━━━━━━━━━━━━━━━\nTap a category below to browse or type 'help <cmd>' for info.`;
  const categories = ["AI", "FUN", "UTILITY"];

  // Flow: Guide user to tap categories instead of typing more help commands
  return api.sendQuickReply(menu, categories, event.sender.id);
};
