const db = require("../modules/database");
const cooldowns = new Map();

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);

    // 1. Name Caching (Speed Upgrade)
    let name = global.userCache.get(senderID);
    if (!name) {
        const info = await api.getUserInfo(senderID);
        name = `${info.first_name} ${info.last_name}`;
        global.userCache.set(senderID, name);
    }

    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`🛠️ **MAINTENANCE MODE**\n━━━━━━━━━━━━━━━━\n${global.MAINTENANCE_REASON}`);
    }

    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        return reply(`👋 Hi ${name.split(" ")[0]}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;
    const body = (event.message?.text || event.postback?.payload || "").trim();
    const hasAttachments = !!(event.message?.attachments);

    // 2. FLOW AUTO-CATCH (Category List)
    const categories = ["AI", "FUN", "UTILITY", "ADMIN"];
    const words = body.split(/\s+/);
    if (words.length === 1 && categories.includes(body.toUpperCase())) {
        const cat = body.toUpperCase();
        if (cat === "ADMIN" && !isAdmin) return;
        let cmdNames = [];
        for (const [n, cmd] of global.client.commands) {
            if (cmd.config.category?.toUpperCase() === cat) cmdNames.push(n);
        }
        return reply(`📁 **${cat} COMMANDS:**\n━━━━━━━━━━━━━━━━\n${cmdNames.sort().join(", ")}`);
    }

    // 3. COMMAND PRIORITY
    const cmdName = words.shift().toLowerCase();
    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("⛔ Admin only.");

        // ✨ COOLDOWN CHECK ✨
        if (command.config.cooldown && command.config.cooldown > 0 && !isAdmin) {
            const now = Date.now();
            const cooldownKey = `${senderID}-${command.config.name}`;
            const lastUsed = cooldowns.get(cooldownKey) || 0;
            const cooldownAmount = command.config.cooldown * 1000;
            const timeLeft = (lastUsed + cooldownAmount) - now;

            if (timeLeft > 0) {
                const seconds = Math.ceil(timeLeft / 1000);
                return reply(`⏳ wait ${seconds}s before using ${command.config.name} again`);
            }
            cooldowns.set(cooldownKey, now);
        }

        try {
            db.trackCommand(cmdName, senderID, name);
            await command.run({ event, args: words, api, reply });
            return; // STOP: Don't trigger AI for commands
        } catch (e) { 
            global.log.error(`error running ${cmdName}:`, e.message);
            reply(`❌ error: ${e.message}`); 
        }
    } 

    // 4. AI FALLBACK
    else if ((body.length > 3 || hasAttachments) && !event.message?.is_echo) {
        const ai = global.client.commands.get("ai");
        const reactions = ["lol", "haha", "wow", "ok", "okay", "?", "nice"];
        if (ai && !reactions.includes(body.toLowerCase())) {
            try {
                if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
                await ai.run({ event, args: body.split(/\s+/), api, reply });
            } finally { if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID); }
        }
    }
};
