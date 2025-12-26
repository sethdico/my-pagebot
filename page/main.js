const utils = require("../modules/utils");

// Ensure we have access to the API methods for commands
const api = {
    sendMessage: async (text, id) => {
        const http = utils.http;
        const url = `https://graph.facebook.com/v21.0/${id}/messages`;
        await http.post(url, {
            messaging_type: "RESPONSE",
            message: { text }
        }, { params: { access_token: global.PAGE_ACCESS_TOKEN } });
    },
    // ... you can add sendButton, sendAttachment here if you have the code for them
    // If you have the files in page/src/, you should import them here and expose them.
    // For this example, we assume basic structure.
};

module.exports = async (event) => {
    const senderID = event.sender.id;
    
    // 1. Handle Cooldowns (Basic)
    if (!global.client.cooldowns.has(senderID)) {
        global.client.cooldowns.set(senderID, new Map());
    }
    const now = Date.now();
    const cmdCooldowns = global.client.cooldowns.get(senderID);

    // 2. Parse Message
    let msg = event.message?.text || "";
    
    // 3. Check for Prefix
    // If the first word matches a command, we run it.
    // Many bots allow commands without prefix in PM, but let's stick to global prefix logic or smart detection
    
    // Split text to find potential command
    const args = msg.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Check if it matches a registered command or alias
    const cmd = global.client.commands.get(commandName) || global.client.commands.get(global.client.aliases.get(commandName));

    if (cmd) {
        // Check Admin Only
        if (cmd.config.adminOnly && !global.ADMINS.has(senderID)) {
            return api.sendMessage("❌ Admins only.", senderID);
        }

        // Check Command Cooldown
        const cooldownTime = cmd.config.cooldown * 1000 || 1000;
        if (cmdCooldowns.has(cmd.config.name)) {
            const expirationTime = cmdCooldowns.get(cmd.config.name) + cooldownTime;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return api.sendMessage(`⏳ Wait ${timeLeft.toFixed(1)}s.`, senderID);
            }
        }

        // Set Cooldown
        cmdCooldowns.set(cmd.config.name, now);

        // Execute Command
        try {
            // We pass a context object with everything the command needs
            const context = {
                event,
                args,
                api,
                reply: (text) => api.sendMessage(text, senderID)
            };
            await cmd.run(context);
        } catch (e) {
            console.error(`[Command Error] ${cmd.config.name}:`, e.message);
            api.sendMessage("❌ Something went wrong.", senderID);
        }
    } else {
        // No command found? Check if it's a conversation (AI)
        // Example: If no prefix and no command, maybe forward to 'ai' or 'aria'?
        // For now, we ignore unknown messages to reduce noise.
    }
};
