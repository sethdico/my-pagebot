const path = require("path");
const gradient = require("gradient-string");

// --- 🛠️ FIX: Manual Color Replacement ---
// We replace 'require("chalk")' with this object to prevent Version 5 crashes.
const chalk = {
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`
};

function html(res) {
  res.sendFile(path.join(__dirname, "index.html"));
}

function verify(req, res) {
  const config = require("../config.json");
  const verifyToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === verifyToken) {
    res.status(200).send(req.query["hub.challenge"]);
  } else { res.sendStatus(403); }
}

function log() {
  const banner = `
   █████╗ ███╗   ███╗██████╗ ██╗   ██╗███████╗
  ██╔══██╗████╗ ████║██╔══██╗██║   ██║██╔════╝
  ███████║██╔████╔██║██║  ██║██║   ██║███████╗
  ██╔══██║██║╚██╔╝██║██║  ██║██║   ██║╚════██║
  ██║  ██║██║ ╚═╝ ██║██████╔╝╚██████╔╝███████║
  ╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝  ╚═════╝ ╚══════╝
  `;
  
  // Try to use gradient, fallback to blue if it fails
  try {
      console.log(gradient.pastel.multiline(banner));
  } catch (e) {
      console.log(chalk.blue(banner));
  }

  console.log(chalk.cyan(`[ SYSTEM ] Amdusbot V16.5 - Active`));
  console.log(chalk.green(`[ SERVER ] Listening on Port 8080`));
}

function getTheme() { 
    return { gradient: gradient.fruit, color: chalk.blue }; 
}

module.exports = { html, verify, log, getTheme };
