const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "1.5",
  category: "Utility",
  description: "Show command list and AI features.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  // 1. Correct Pathing: Point exactly to where the commands are
  const commandsPath = __dirname; 
  const senderID = event.sender.id;

  // 2. Handle "help ai"
  if (args[0]?.toLowerCase() === "ai") {
    const aiHelp = `🤖 **Amdusbot AI Capabilities**\n━━━━━━━━━━━━━━━━\n` +
      `• **Chat**: Talk naturally in any language.\n` +
      `• **Vision**: Send a photo to analyze it.\n` +
      `• **YouTube**: Send a link to summarize videos.\n` +
      `• **Files**: Ask for .pdf, .docx, or .txt files.\n` +
      `• **Drawing**: Ask me to draw an image.\n\n` +
      `💡 *No prefix needed, just talk!*`;
    return api.sendMessage(aiHelp, senderID);
  }

  // 3. General Help List
  try {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    const categories = {};

    commandFiles.forEach(file => {
      const cmd = require(path.join(commandsPath, file));
      if (cmd.config && cmd.config.name) {
        const cat = cmd.config.category || "Uncategorized";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmd.config.name);
      }
    });

    let msg = `🤖 **Amdusbot Command List**\n━━━━━━━━━━━━━━━━\n`;
    for (const [category, cmds] of Object.entries(categories)) {
      msg += `📂 **${category}**\n   ${cmds.join(", ")}\n\n`;
    }
    msg += `━━━━━━━━━━━━━━━━\n💡 Type "help ai" for AI tips.`;

    api.sendMessage(msg, senderID);
  } catch (err) {
    console.error(err);
    api.sendMessage("❌ Error listing commands. Check server logs.", senderID);
  }
};
