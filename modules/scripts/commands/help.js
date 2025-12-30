const db = require("../../database");

module.exports.config = {
  name: "help", author: "Sethdico", version: "16.0", category: "Utility", description: "Command list.", adminOnly: false, usePrefix: false, cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();
  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) return reply(`🤖 **${cmd.config.name.toUpperCase()}**\n━━━━━━━━━━━━━━━━\nInfo: ${cmd.config.description}`);
  }

  const top = await db.getStats();
  const trending = top.map(c => c.command).join(", ") || "None yet";

  const msg = `🤖 **COMMAND LIST**\n━━━━━━━━━━━━━━━━\n` +
              `📁 AI\n` +
              `📁 FUN\n` +
              `📁 UTILITY\n\n` +
              `🔥 **TRENDING:** ${trending}\n\n` +
              `Type a category name to browse.`;

  return reply(msg);
};
