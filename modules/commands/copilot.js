const { http, parseAI } = require("../utils");
const API_URLS = require("../../../config/apis");

module.exports.config = {
  name: "copilot", author: "Sethdico", version: "6.1", category: "AI", description: "Copilot AI (default, think, gpt5)", adminOnly: false, usePrefix: false, cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
  let model = "default";
  let message = args.join(" ");

  if (args[0]?.startsWith("--")) {
      const flag = args[0].slice(2).toLowerCase();
      if (flag === "think") { model = "think-deeper"; message = args.slice(1).join(" "); }
      else if (flag === "gpt5") { model = "gpt-5"; message = args.slice(1).join(" "); }
  }

  if (!message) return reply("💭 Usage: copilot [--think/--gpt5] <text>");
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

  try {
    const res = await http.get(API_URLS.copilot, { params: { message: message, model: model }, timeout: 60000 });
    const result = parseAI(res);
    api.sendMessage(`💭 **COPILOT (${model.toUpperCase()})**\n────────────────\n${result || "No response."}`, event.sender.id);
  } catch (e) {
    reply("❌ Copilot unreachable.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
  }
};
