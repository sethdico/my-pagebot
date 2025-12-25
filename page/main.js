const fs = require("fs");
const path = require("path");

module.exports = async function (event) {
  const api = {};
  const srcPath = path.join(__dirname, "src");

  // Automatically loads page/src
  fs.readdirSync(srcPath).filter(f => f.endsWith(".js")).forEach(file => {
    try {
      const scriptName = path.parse(file).name;
      const loaded = require(`./src/${file}`);
      if (typeof loaded === "function") api[scriptName] = loaded(event);
    } catch (e) { console.error(`❌ API Load Fail: ${file}`); }
  });
  
  global.api = api;
  require("./handler.js")(event);
};
