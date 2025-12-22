const config = require("../../../config.json");

module.exports.config = {
  name: "help",
  author: "Sethdico",
  version: "11.0-Fixed",
  category: "Utility",
  description: "View command list or folder details.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const prefix = config.PREFIX || "/";
  const commands = global.client.commands;
  const input = args[0]?.toLowerCase();

  const commandDetails = {
    ai: { hint: "[question]", example: "ai explain quantum physics" },
    translate: { hint: "[lang] [text] OR just [text]", example: "translate Hello" },
    pokemon: { hint: "[name]", example: "pokemon pikachu" },
    nasa: { hint: "random", example: "nasa random" },
    remind: { hint: "[time] [message]", example: "remind 10m check oven" },
    wiki: { hint: "[query]", example: "wiki albert einstein" },
    ban: { hint: "[ID]", example: "ban 1234567890" },
    unban: { hint: "[ID]", example: "unban 1234567890" },
    deepimg: { hint: "[prompt]", example: "deepimg cat in space" },
    aria: { hint: "[question]", example: "aria what is AI?" },
    copilot: { hint: "[message]", example: "copilot code a function" },
    quillbot: { hint: "[text]", example: "quillbot rewrite this text" },
    venice: { hint: "[question]", example: "venice summarize this" },
    webpilot: { hint: "[query]", example: "webpilot search latest news" },
    youai: { hint: "[question]", example: "youai explain blockchain" },
    dict: { hint: "[word]", example: "dict serendipity" },
    uid: { hint: "", example: "uid" },
    gemini: { hint: "[question]", example: "gemini what is love?" },
  };

  try {
    const categories = {};
    const adminCommands = [];

    commands.forEach((cmd) => {
      if (!cmd.config) return;
      const cat = cmd.config.category || "General";

      if (cat.toLowerCase() === "admin") {
        adminCommands.push(cmd.config);
        return;
      }

      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(cmd.config);
    });

    const categoryNames = Object.keys(categories);
    
    // ✅ Fixed: Check both ADMIN and ADMINS
    const adminList = config.ADMINS || config.ADMIN || [];

    if (input === "admin") {
      if (!adminList.includes(senderID)) {
        return api.sendMessage("⛔ You don't have permission to view admin commands.", senderID);
      }

      let adminMsg = `🔐 **ADMIN COMMANDS**\n───────────────\n`;
      adminCommands
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((cmd) => {
          const details = commandDetails[cmd.name] || {};
          const usage = `${cmd.usePrefix ? prefix : ""}${cmd.name} ${details.hint || ""}`;

          adminMsg += `🔹 **${cmd.name.toUpperCase()}**\n`;
          adminMsg += `📄 ${cmd.description || "No description."}\n`;
          adminMsg += `💡 Usage: \`${usage}\`\n`;
          if (details.example) adminMsg += `📌 Example: \`${details.example}\`\n`;
          adminMsg += `\n`;
        });

      adminMsg += `───────────────\n🔐 *Admin-only commands*`;
      return api.sendMessage(adminMsg, senderID);
    }

    const matchedCat = categoryNames.find((c) => c.toLowerCase() === input);
    if (matchedCat) {
      let catMsg = `📂 **FOLDER: ${matchedCat.toUpperCase()}**\n───────────────\n`;
      categories[matchedCat]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((cmd) => {
          const details = commandDetails[cmd.name] || {};
          const usage = `${cmd.usePrefix ? prefix : ""}${cmd.name} ${details.hint || ""}`;
          const desc = cmd.name === "ai"
            ? "No need to use this command since it automatically answers your questions without a command name."
            : cmd.description || "No description.";

          catMsg += `🔹 **${cmd.name.toUpperCase()}**\n`;
          catMsg += `📄 ${desc}\n`;
          catMsg += `💡 Usage: \`${usage}\`\n`;
          if (details.example) catMsg += `📌 Example: \`${details.example}\`\n`;
          catMsg += `\n`;
        });

      catMsg += `───────────────\n💡 *Type "help [command]" for more info.*`;
      return api.sendMessage(catMsg, senderID);
    }

    if (input && (commands.has(input) || global.client.aliases.has(input))) {
      const cmdName = commands.has(input) ? input : global.client.aliases.get(input);
      const cmd = commands.get(cmdName).config;
      const details = commandDetails[cmd.name] || {};

      const msg =
        `🤖 **COMMAND: ${cmd.name.toUpperCase()}**\n` +
        `───────────────\n` +
        `📄 **Info:** ${cmd.name === "ai" ? "No need to use this command since it automatically answers your questions without a command name." : cmd.description || "No description."}\n` +
        `🔧 **Usage:** ${cmd.usePrefix ? prefix : ""}${cmd.name} ${details.hint || ""}\n` +
        `${details.example ? `📌 **Example:** ${details.example}\n` : ""}` +
        `${cmd.aliases && cmd.aliases.length > 0 ? `🔗 **Aliases:** ${cmd.aliases.join(", ")}\n` : ""}` +
        `⏱️ **Cooldown:** ${cmd.cooldown || 0}s\n` +
        `───────────────`;

      return api.sendButton(msg, [{ type: "postback", title: "⬅️ Back", payload: "help" }], senderID);
    }

    const totalCommands = Array.from(commands.values()).filter((c) => c.config).length;
    let menuMsg = `🤖 **AMDUSBOT MENU**\n───────────────\n📊 Total Commands: ${totalCommands}\n\n`;
    const buttons = [];
    const sortedCats = categoryNames.sort();

    sortedCats.forEach((cat) => {
      const cmdList = categories[cat];
      const names = cmdList.map((c) => c.name).sort().join(", ");
      menuMsg += `📁 **${cat.toUpperCase()}** (${cmdList.length})\n[ ${names} ]\n\n`;

      if (buttons.length < 3) {
        buttons.push({ type: "postback", title: `📂 ${cat}`, payload: `help ${cat.toLowerCase()}` });
      }
    });

    if (adminList.includes(senderID) && adminCommands.length > 0) {
      menuMsg += `🔐 **ADMIN** (${adminCommands.length})\n[ Type "help admin" to view ]\n\n`;
    }

    menuMsg += `───────────────\n💡 Click a folder or type "help [folder]" to see commands.\n📖 Type "help [command]" for details.`;

    await api.sendButton(menuMsg, buttons, senderID);
  } catch (err) {
    console.error("[help.js] Error:", err);
    return api.sendMessage("❌ An error occurred. Try typing 'help' to see the menu.", senderID);
  }
};
