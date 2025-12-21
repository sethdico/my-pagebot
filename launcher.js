const { spawn } = require("child_process");
const path = require("path");

function startBot() {
    const mainFile = path.join(__dirname, "index.js");
    
    console.log("🚀 Launching Amdusbot...");

    // Spawn index.js as a child process
    const bot = spawn("node", [mainFile], {
        stdio: "inherit", // Keeps colors and logs in the main console
        shell: true
    });

    // Listen for the bot crashing or stopping
    bot.on("close", (code) => {
        if (code === 0) {
            console.log("🛑 Bot stopped manually.");
            process.exit(0);
        } else {
            console.error(`⚠️ Bot crashed with code ${code}. Restarting in 3 seconds...`);
            setTimeout(() => {
                startBot(); // Recursively restart
            }, 3000);
        }
    });

    bot.on("error", (err) => {
        console.error("🔥 Critical Launcher Error:", err);
    });
}

startBot();
