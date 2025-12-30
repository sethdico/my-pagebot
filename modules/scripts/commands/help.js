module.exports.config = {
  name: "help", author: "Sethdico", version: "15.0", category: "Utility", description: "Command list.", adminOnly: false, usePrefix: false, cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();
  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) return reply(`🤖 **${cmd.config.name.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n${cmd.config.description}`);
  }

  const msg = `🤖 **COMMAND LIST**\n━━━━━━━━━━━━━━━━\n` +
              `📁 AI\n` +
              `📁 FUN\n` +
              `📁 UTILITY\n\n` +
              `Type a category name to see commands.\n` +
              `*Note: Buttons might not work on FB Lite.*`;

  return reply(msg);
};
