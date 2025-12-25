module.exports = async function (event) {
  const config = require("../config.json");
  const api = {};
  
  const scripts = [
    "markAsSeen",
    "sendMessage",
    "sendTypingIndicator",
    "sendAttachment",
    "sendButton",
    "sendQuickReply",
    "sendCarousel",
    "getUserInfo"
  ];

  for (const scriptName of scripts) {
    try {
      const loadedScript = require(`./src/${scriptName}`);
      if (typeof loadedScript === "function") {
        api[scriptName] = loadedScript(event);
      }
    } catch (e) {
      console.error(`Failed to load API script: ${scriptName}`, e);
    }
  }
  
  global.api = api;
  global.PREFIX = config.PREFIX;
  
  require("./handler.js")(event);
};
