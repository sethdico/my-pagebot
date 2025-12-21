const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "3.0-Menu",
  category: "Utility",
  description: "Interactive command menu.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  
  // Get all commands from the global cache (created in index.js)
  const commands = global.client.commands;
  const categories = {};

  // Sort commands into categories
  commands.forEach((cmd) => {
      const cat = cmd.config.category || "General";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd.config.name);
  });

  // If user typed "help <category>", show that category
  const targetCategory = args[0] ? args[0].toLowerCase() : null;

  if (targetCategory) {
      // Find matching category (case insensitive)
      const catName = Object.keys(categories).find(c => c.toLowerCase() === targetCategory);
      
      if (catName) {
          const cmds = categories[catName].join(", ");
          const msg = `📂 **Category: ${catName}**\n━━━━━━━━━━━━━━━━\n${cmds}\n━━━━━━━━━━━━━━━━\nType a command name to use it!`;
          
          // Back Button
          const buttons = [{ type: "postback", title: "⬅️ Back to Menu", payload: "help" }];
          return api.sendButton(msg, buttons, senderID);
      }
  }

  // --- MAIN MENU ---
  let msg = `🤖 **Amdusbot Menu**\nSelect a category below:\n`;
  const buttons = [];

  Object.keys(categories).forEach(cat => {
      msg += `\n📁 ${cat}`;
      // Add a button for this category
      if (buttons.length < 3) { // FB limits buttons to 3. 
          // If you have more than 3 categories, we prioritize the popular ones or group them.
          buttons.push({
              type: "postback",
              title: `📂 ${cat}`,
              payload: `help ${cat}` // This triggers the command again with the category
          });
      }
  });

  // If we have too many categories for buttons, just list them in text
  if (Object.keys(categories).length > 3) {
      msg += `\n\n(Type "help ai" or "help fun" to see more)`;
  }

  await api.sendButton(msg, buttons, senderID);
};
