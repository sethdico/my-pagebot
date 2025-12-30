const spamMap = new Map();
const db = require("../modules/database");

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    // 1. Maintenance Gatekeeper
    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`🛠️ **MAINTENANCE MODE**\n━━━━━━━━━━━━━━━━\n${global.MAINTENANCE_REASON}`);
    }

    // 2. Setup (Welcome)
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;
    const body = event.message?.text || event.postback?.payload || "";
    const hasAttachments = !!(event.message?.attachments);
    if (!body && !hasAttachments) return;

    // 3. Command Recognition Logic
    const prefix = global.PREFIX || ".";
    const isPrefixed = body.startsWith(prefix);
    const input = isPrefixed ? body.slice(prefix.length).trim() : body.trim();
    const args = input.split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    // 4. THE COMMAND GATE (Priority #1)
    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("⛔ Admin only.");
        try {
            db.trackCommand(cmdName);
            await command.run({ event, args, api, reply });
            return; // EXIT: Prevents AI from replying to command words
        } catch (e) {
            console.error(e);
            return reply(`❌ Error in ${cmdName}.`);
        }
    }

    // 5. Traditional Help Category List
    const categories = ["AI", "FUN", "UTILITY", "ADMIN"];
    if (categories.includes(body.toUpperCase())) {
        let list = `📁 **${body.toUpperCase()} COMMANDS:**\n\n`;
        for (const [name, cmd] of global.client.commands) {
            if (cmd.config.category?.toUpperCase() === body.toUpperCase()) list += `• ${name}\n`;
        }
        return reply(list);
    }

    // 6. Anti-Spam
    let userData = spamMap.get(senderID) || { count: 0, time: Date.now() };
    if (Date.now() - userData.time > 5000) { userData.count = 0; userData.time = Date.now(); }
    userData.count++;
    spamMap.set(senderID, userData);
    if (userData.count > 10) return reply("⏳ Slow down."); 

    // 7. AI Fallback (Only if not a command)
    const ai = global.client.commands.get("ai");
    if (ai && (body.length > 0 || hasAttachments)) {
        try {
            await ai.run({ event, args: body.trim().split(/\s+/), api, reply });
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    }
};
