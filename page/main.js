const fs = require("fs");
const path = require("path");

const tools = {}; 
const srcPath = path.join(__dirname, "src");

// load all the api scripts just once when bot starts
try {
    fs.readdirSync(srcPath).filter(f => f.endsWith(".js")).forEach(file => {
        const name = path.parse(file).name;
        tools[name] = require(`./src/${file}`);
    });
    console.log(`Loaded ${Object.keys(tools).length} API tools`);
} catch (e) {
    console.log("Error loading API tools:", e);
}

module.exports = async function (event) {
    // create a temp api object for this specific event
    const api = {};

    // attach our pre-loaded tools
    for (const key in tools) {
        // pass 'event' so the tool knows who to reply to automatically
        api[key] = tools[key](event);
    }

    global.api = api; // update global ref just in case
    
    // send it to the handler
    require("./handler.js")(event);
};
