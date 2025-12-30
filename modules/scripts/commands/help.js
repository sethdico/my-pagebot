module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "17.0",
  category: "Utility",
  description: "Interactive command menu.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api, reply }) => {
  const input = args[0]?.toLowerCase();

  // 1. Handle "help <cmd>"
  if (input) {
      const cmd = global.client.commands.get(input) || 
                  global.client.commands.get(global.client.aliases.get(input));
      if (cmd) {
          return reply(`🤖 **${cmd.config.name.toUpperCase()}**\n━━━━━━━━━━━━━━━━\nInfo: ${cmd.config.description}\nCategory: ${cmd.config.category}`);
      }
  }

  // 2. Build the Categorized List (Your exact format)
  const structure = { "AI": [], "FUN": [], "UTILITY": [] };
  
  for (const [name, cmd] of global.client.commands) {
      const cat = cmd.config.category?.toUpperCase();
      if (structure[cat]) structure[cat].push(name);
  }

  let fullMsg = `🤖 **COMMANDS**\n━━━━━━━━━━━━━━━━\n`;
  for (const cat in structure) {
      if (structure[cat].length > 0) {
          fullMsg += `📁 ${cat}: ${structure[cat].sort().join(", ")}\n\n`;
      }
  }
  fullMsg += `Type 'help <cmd>' for details.`;

  // 3. Send as a Button Template
  const buttons = [
    { type: "postback", title: "AI", payload: "AI" },
    { type: "postback", title: "FUN", payload: "FUN" },
    { type: "postback", title: "UTILITY", payload: "UTILITY" }
  ];

  try {
      await api.sendButton(fullMsg, buttons, event.sender.id);
  } catch (e) {
      // Fallback for Lite
      reply(fullMsg);
  }
};
