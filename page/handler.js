// keep track of spammers in memory
const spamMap = new Map();

module.exports = async function (event) {
    const api = global.api;
    const senderID = event.sender.id;

    // shortcut function so we don't type api.sendMessage every time
    const reply = (msg) => api.sendMessage(msg, senderID);

    // --- 1. ANTI SPAM ---
    const now = Date.now();
    let userData = spamMap.get(senderID) || { count: 0, time: 0 };

    // reset count if 2 seconds passed
    if (now - userData.time > 2000) {
        userData.count = 0;
        userData.time = now;
    }

    userData.count++;
    spamMap.set(senderID, userData);

    // ignore if they spamming (more than 5 msgs in 2s)
    if (userData.count > 5) return; 

    // --- 2. SETUP ---
    // handle get started button
    if (event.postback?.payload === "GET_STARTED_PAYLOAD") {
        const info = await api.getUserInfo(senderID);
        return reply(`👋 hi ${info.first_name || "user"}! type help to start.`);
    }

    // ignore bot echoes
    if (event.message?.is_echo) return;

    // get the text body
    const body = event.message?.text || event.postback?.payload || "";
    
    // if no text and no attachments, just ignore
    if (!body && !event.message?.attachments) return;

    // --- 3. COMMAND HANDLING ---
    const args = body.trim().split(/\s+/); // split by spaces
    const cmdName = args.shift().toLowerCase(); // get first word

    // look for command or alias
    const command = global.client.commands.get(cmdName) || 
                    global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
        // admin check
        if (command.config.adminOnly && !global.ADMINS.has(senderID)) {
            return reply("⛔ admin only.");
        }

        try {
            // run the command
            await command.run({ event, args, api, reply });
        } catch (e) {
            console.error(e);
            reply("❌ command crashed. sorry.");
        }
    } else {
        // --- 4. AI FALLBACK ---
        // if no command matches, send to AI
        const ai = global.client.commands.get("ai");
        if (ai) {
            try {
                // reconstruct the text for AI
                await ai.run({ event, args: body.split(" "), api, reply });
            } catch (e) {
                // silent fail
            }
        }
    }
};
