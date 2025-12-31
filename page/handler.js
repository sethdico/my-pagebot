const db = require("../modules/core/database");
const cooldowns = new Map();

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    
    const id = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, id);
    const isAdmin = global.ADMINS.has(id);
    const now = Date.now();

    // sync user data (buffered)
    try {
        const userInfo = await api.getUserInfo(id).catch(() => ({ name: 'user' }));
        db.syncUser(id, userInfo);
    } catch (e) {
        db.syncUser(id);
    }

    // maintenance check
    if (global.MAINTENANCE_MODE && !isAdmin) {
        return reply(`maintenance mode: ${global.MAINTENANCE_REASON}`);
    }

    // get started
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        return reply("ask questions or type help to see commands.");
    }

    if (event.message?.is_echo) return;
    
    const body = (event.message?.text || event.postback?.payload || "").trim();
    if (!body) return;

    const args = body.split(/\s+/);
    const cmdName = args.shift().toLowerCase();
    
    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !isAdmin) return;

        // cooldown
        if (command.config.cooldown && !isAdmin) {
            const key = `${id}-${command.config.name}`;
            const lastUsed = cooldowns.get(key) || 0;
            const timeLeft = (lastUsed + (command.config.cooldown * 1000)) - now;

            if (timeLeft > 0) return reply(`wait ${Math.ceil(timeLeft / 1000)}s`);
            cooldowns.set(key, now);
        }

        try {
            db.trackCommandUsage(cmdName);
            await command.run({ event, args, api, reply });
        } catch (e) { 
            console.error(`error running ${cmdName}:`, e.message);
            reply("error executing command."); 
        }
    } 
    // AI fallback
    else if (body.length > 2) {
        const ai = global.client.commands.get("ai");
        if (ai) {
            try {
                if (api.sendTypingIndicator) api.sendTypingIndicator(true, id).catch(()=>{});
                await ai.run({ event, args: body.split(/\s+/), api, reply });
            } catch (e) {
                // silent fail for ai
            } finally { 
                if (api.sendTypingIndicator) api.sendTypingIndicator(false, id).catch(()=>{}); 
            }
        }
    }
};
