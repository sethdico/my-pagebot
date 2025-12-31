const db = require("../modules/database");
const cooldowns = new Map();

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);
    const isAdmin = global.ADMINS.has(senderID);
    const now = Date.now();

    // 1. SMART SYNC & AUTO-PURGE LOGIC
    let user = global.userCache.get(senderID);
    
    try {
        // Run database cleanup once every 100 messages (randomly) to keep DB small
        if (Math.random() < 0.01) db.purgeInactiveUsers();

        // Check if user info is in cache or needs updating (once every 24h)
        if (!user || !user.lastSynced || (now - new Date(user.lastSynced).getTime() > 86400000)) {
            let dbUser = await db.getUserData(senderID);
            
            // If not in DB or 24h passed, get fresh Facebook Info
            if (!dbUser || !dbUser.lastSynced || (now - new Date(dbUser.lastSynced).getTime() > 86400000)) {
                const fb = await api.getUserInfo(senderID);
                const fbData = {
                    name: fb.name || `${fb.first_name} ${fb.last_name}`,
                    firstName: fb.first_name,
                    lastName: fb.last_name,
                    profilePic: fb.profile_pic,
                    gender: fb.gender,
                    birthday: fb.birthday,
                    link: fb.link,
                    locale: fb.locale,
                    timezone: fb.timezone
                };
                user = await db.syncUser(senderID, fbData);
            } else {
                // Just update interaction time
                user = await db.syncUser(senderID);
            }
            global.userCache.set(senderID, user);
        } else {
            // Update interaction count/time only (in background)
            db.syncUser(senderID);
        }
    } catch (e) {
        global.log.error("Sync Error:", e.message);
        // Fallback name if sync fails
        if (!user) user = { firstName: "User", name: "User" };
    }

    // 2. MAINTENANCE
    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`🛠️ **MAINTENANCE MODE**\n━━━━━━━━━━━━━━━━\n${global.MAINTENANCE_REASON}`);
    }

    // 3. GET STARTED
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        return reply(`👋 Hi ${user.firstName || 'there'}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;
    const body = (event.message?.text || event.postback?.payload || "").trim();
    const hasAttachments = !!(event.message?.attachments);

    // 4. CATEGORY LIST
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

    // 5. COMMAND EXECUTION
    const cmdName = words.shift().toLowerCase();
    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return reply("⛔ Admin only.");

        // Cooldown Check
        if (command.config.cooldown && command.config.cooldown > 0 && !isAdmin) {
            const cooldownKey = `${senderID}-${command.config.name}`;
            const lastUsed = cooldowns.get(cooldownKey) || 0;
            const timeLeft = (lastUsed + (command.config.cooldown * 1000)) - now;

            if (timeLeft > 0) return reply(`⏳ wait ${Math.ceil(timeLeft / 1000)}s`);
            cooldowns.set(cooldownKey, now);
        }

        try {
            db.trackCommandUsage(cmdName);
            await command.run({ event, args: words, api, reply });
            return;
        } catch (e) { 
            global.log.error(`error running ${cmdName}:`, e.message);
            reply(`❌ error: ${e.message}`); 
        }
    } 

    // 6. AI FALLBACK
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
