const spamMap = new Map();

module.exports = async function (event, api) {
    if (!event.sender || !event.sender.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);

    // 1. Setup (RESTORED: The Welcome Message for new players)
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        try {
            const info = await api.getUserInfo(senderID);
            return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to see my commands.`);
        } catch (e) {
            return reply(`👋 Hi! Type 'help' to start.`);
        }
    }

    // 2. Anti-Spam (RESTORED from your latest version)
    const now = Date.now();
    let userData = spamMap.get(senderID) || { count: 0, time: 0 };
    if (now - userData.time > 5000) {
        userData.count = 0;
        userData.time = now;
    }
    userData.count++;
    spamMap.set(senderID, userData);
    if (userData.count > 10) return; 

    if (event.message?.is_echo) return;

    // 3. Prefix & Command Logic (FIXED: Won't crash on non-prefixed text)
    const body = event.message?.text || event.postback?.payload || "";
    if (!body && !event.message?.attachments) return;

    const prefix = global.PREFIX || ".";
    const isPrefixed = body.startsWith(prefix);
    
    // Process input: remove prefix if it exists
    const input = isPrefixed ? body.slice(prefix.length).trim() : body.trim();
    const args = input.split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (isPrefixed && command) {
        // Run Command
        if (command.config.adminOnly && !global.ADMINS.has(senderID)) {
            return reply("⛔ Admin only.");
        }
        try {
            await command.run({ event, args, api, reply });
        } catch (e) {
            console.error(`[Command Error: ${cmdName}]`, e);
            reply("❌ Error executing command.");
        }
    } else if (!isPrefixed && body.length > 0) {
        // 4. AI Fallback (Fixed: AI gets the whole message as context)
        const ai = global.client.commands.get("ai");
        if (ai) {
            try {
                await ai.run({ event, args: body.trim().split(/\s+/), api, reply });
            } catch (e) {
                console.error("AI Fallback Error:", e.message);
            }
        }
    }
};
