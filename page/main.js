const path = require("path");
const fs = require("fs");
const handler = require("./handler");

const tools = {};
const srcPath = path.join(__dirname, "src");
fs.readdirSync(srcPath).forEach(file => {
    if (file.endsWith(".js")) tools[path.parse(file).name] = require(`./src/${file}`);
});

module.exports = async function (event) {
    const api = {};
    for (const key in tools) api[key] = tools[key](event);
    global.api = api; 
    try { await handler(event, api); } catch (e) { console.error("Handler Error:", e); }
};
