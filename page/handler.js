const spamMap = new Map();

module.exports = async function (event, api) {
    if (!event.sender?.id) return;
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);

    // 1. Welcome Logic
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! I'm Amduspage. Type 'help' to start.`);
    }

    // 2. Anti-Spam
    let userData = spamMap.get(senderID) || { count: 0, time: Date.now() };
    if (Date.now() - userData.time > 5000) { userData.count = 0; userData.time = Date.now(); }
    userData.count++;
    spamMap.set(senderID, userData);

    if (userData.count === 11) return reply("⏳ Woah! Slow down a bit.");
    if (userData.count > 10) return; 

    if (event.message?.is_echo) return;
    const body = event.message?.text || event.postback?.payload || "";
    const hasAttachments = !!(event.message?.attachments);

    if (!body && !hasAttachments) return;

    // 3. Command Identification
    const prefix = global.PREFIX;
    const isPrefixed = body.startsWith(prefix);
    const input = isPrefixed ? body.slice(prefix.length).trim() : body.trim();
    const args = input.split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        if (command.config.adminOnly && !global.ADMINS.has(senderID)) return reply("⛔ Admin only.");
        try {
            await command.run({ event, args, api, reply });
        } catch (e) {
            console.error(`[CRASH] ${cmdName}:`, e.message);
            reply(`❌ Logic error in ${cmdName}.`);
        } finally {
            // Force typing off just in case
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    } else if ((body.length > 0 || hasAttachments) && !event.message?.is_echo) {
        // 4. AI Fallback (Fixed: triggers on text OR images)
        const ai = global.client.commands.get("ai");
        if (ai) await ai.run({ event, args: body.trim().split(/\s+/), api, reply });
    }
};
