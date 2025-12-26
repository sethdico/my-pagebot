const spamMap = new Map();

module.exports = async function (event, api) {
    if (!event.sender || !event.sender.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);

    // 1. Anti-Spam (10 messages per 5s to avoid FB blocks)
    const now = Date.now();
    let userData = spamMap.get(senderID) || { count: 0, time: 0 };
    if (now - userData.time > 5000) {
        userData.count = 0;
        userData.time = now;
    }
    userData.count++;
    spamMap.set(senderID, userData);
    if (userData.count > 10) return; 

    // 2. Setup (Get Started)
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to see my commands.`);
    }

    if (event.message?.is_echo) return;

    const body = event.message?.text || event.postback?.payload || "";
    if (!body && !event.message?.attachments) return;

    // 3. Prefix & Command Logic
    const prefix = global.PREFIX || ".";
    const isPrefixed = body.startsWith(prefix);
    
    // Process input: remove prefix if it exists, otherwise use raw body
    const input = isPrefixed ? body.slice(prefix.length).trim() : body.trim();
    const args = input.split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !global.ADMINS.has(senderID)) {
            return reply("⛔ Admin only.");
        }
        try {
            await command.run({ event, args, api, reply });
        } catch (e) {
            console.error(`[Command Error: ${cmdName}]`, e);
            reply("❌ Error executing command.");
        }
    } else {
        // 4. AI Fallback (Only for non-prefixed text or if no command found)
        const ai = global.client.commands.get("ai");
        if (ai && body.trim().length > 0) {
            try {
                // Pass full body to AI as args
                await ai.run({ event, args: body.trim().split(/\s+/), api, reply });
            } catch (e) {
                console.error("AI Fallback Error:", e.message);
            }
        }
    }
};
