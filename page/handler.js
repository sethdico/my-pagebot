const spamMap = new Map();

module.exports = async function (event, api) {
    const senderID = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, senderID);

    // 1. Anti-Spam
    const now = Date.now();
    let userData = spamMap.get(senderID) || { count: 0, time: 0 };

    // Reset spam counter after 3 seconds
    if (now - userData.time > 3000) {
        userData.count = 0;
        userData.time = now;
    }

    userData.count++;
    spamMap.set(senderID, userData);

    if (userData.count > 6) return; // Ignore spam

    // 2. Setup
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 Hi ${info.first_name || "there"}! Type 'help' to start.`);
    }

    if (event.message?.is_echo) return;

    const body = event.message?.text || event.postback?.payload || "";
    if (!body && !event.message?.attachments) return;

    // 3. Command Handling
    const args = body.trim().split(/\s+/);
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
            console.error(e);
            reply("❌ Error executing command.");
        }
    } else {
        // 4. AI Fallback (for text messages)
        const ai = global.client.commands.get("ai");
        if (ai && !event.message?.is_echo) {
            try {
                await ai.run({ event, args: body.split(" "), api, reply });
            } catch (e) {
                // silent fail
            }
        }
    }
};
