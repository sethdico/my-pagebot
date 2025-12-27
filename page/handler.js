const spamMap = new Map();

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);

    // 1. Welcome Player (RESTORED)
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to start.`);
    }

    // 2. Anti-Spam
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

    const body = event.message?.text || event.postback?.payload || "";
    if (!body && !event.message?.attachments) return;

    // 3. Command Recognition
    const prefix = global.PREFIX || ".";
    const isPrefixed = body.startsWith(prefix);
    const input = isPrefixed ? body.slice(prefix.length).trim() : body.trim();
    const args = input.split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        // Runs command immediately
        if (command.config.adminOnly && !global.ADMINS.has(senderID)) {
            return reply("⛔ Admin only.");
        }
        try {
            await command.run({ event, args, api, reply });
        } catch (e) {
            console.error(`Error in ${cmdName}:`, e);
            reply("❌ Error executing command.");
        }
    } else if (body.length > 0) {
        // 4. AI Fallback (Only if not a command)
        const ai = global.client.commands.get("ai");
        if (ai) {
            try {
                await ai.run({ event, args: body.trim().split(/\s+/), api, reply });
            } catch (e) {}
        }
    }
};
