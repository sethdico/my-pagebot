const spamMap = new Map();
const db = require("../modules/database");

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    // Get Name for Database
    const info = await api.getUserInfo(senderID);
    const name = `${info.first_name} ${info.last_name}`;

    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`🛠️ **MAINTENANCE MODE**\n━━━━━━━━━━━━━━━━\n${global.MAINTENANCE_REASON}`);
    }

    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;
    const body = (event.message?.text || event.postback?.payload || "").trim();
    const hasAttachments = !!(event.message?.attachments);
    if (!body && !hasAttachments) return;

    // Command Logic
    const args = body.split(/\s+/);
    const cmdName = args.shift().toLowerCase();
    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("⛔ Admin only.");
        try {
            db.trackCommand(cmdName, senderID, name);
            await command.run({ event, args, api, reply });
            return;
        } catch (e) {
            console.error(e);
            reply(`❌ Logic error in ${cmdName}.`);
        }
    } 

    // AI Fallback
    else if ((body.length > 0 || hasAttachments) && !event.message?.is_echo) {
        const ai = global.client.commands.get("ai");
        if (ai) {
            try { await ai.run({ event, args: body.split(/\s+/), api, reply }); }
            finally { if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID); }
        }
    }
};
