const spamMap = new Map();

module.exports = async function (event, api) {
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);

    // 1. Anti-Spam (6 messages per 3 seconds)
    const now = Date.now();
    let userData = spamMap.get(senderID) || { count: 0, time: 0 };
    if (now - userData.time > 3000) {
        userData.count = 0;
        userData.time = now;
    }
    userData.count++;
    spamMap.set(senderID, userData);
    if (userData.count > 6) return;

    // 2. Setup / Get Started
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! I'm Amduspage. How can I help you today?`);
    }

    if (event.message?.is_echo) return;

    const body = event.message?.text || event.postback?.payload || "";
    if (!body && !event.message?.attachments) return;

    // 3. Command Parsing (Prefix is OPTIONAL)
    const prefix = global.PREFIX || ".";
    let input = body.trim();

    // If it starts with the prefix, strip it for the check
    if (input.startsWith(prefix)) {
        input = input.slice(prefix.length).trim();
    }

    const args = input.split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    // Look for command by name or alias
    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        // Handle Admin Only commands
        if (command.config.adminOnly && !global.ADMINS.has(senderID)) {
            return reply("⛔ This command is for Admins only.");
        }

        try {
            await command.run({ event, args, api, reply });
        } catch (e) {
            console.error(`[Command Error: ${cmdName}]`, e);
            reply("❌ Error executing command.");
        }
    } else {
        // 4. AI Fallback (If no command matched, even without a prefix)
        // We exclude echoes and empty messages
        if (!event.message?.is_echo && body.trim().length > 0) {
            const ai = global.client.commands.get("ai");
            if (ai) {
                try {
                    // Pass the full original text to the AI
                    await ai.run({ event, args: body.trim().split(/\s+/), api, reply });
                } catch (e) {
                    console.error("AI Fallback Error:", e.message);
                }
            }
        }
    }
};
