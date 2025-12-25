const axios = require("axios");

// stores user emails in RAM: Map<senderID, emailAddress>
const userMails = new Map();

module.exports.config = {
    name: "tempmail",
    author: "Sethdico",
    version: "1.0",
    category: "Utility",
    description: "generate temp mail and check inbox via apyhub.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const action = args[0]?.toLowerCase();
    const token = process.env.APY_TOKEN;

    if (!token) return reply("❌ apy_token missing on render.");

    // 1. generate mail
    if (action === "gen" || !action) {
        if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
        try {
            const res = await axios.post('https://api.apyhub.com/utility/temp-email', {}, {
                headers: { 'apy-token': token }
            });
            const email = res.data.data;
            userMails.set(senderID, email);
            return reply(`📧 **temp mail**\n━━━━━━━━━━━━━━━━\naddress: ${email}\n\n💡 type "tempmail inbox" to check for messages.`);
        } catch (e) {
            return reply("❌ failed to generate mail.");
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    }

    // 2. check inbox
    if (action === "inbox" || action === "check") {
        const email = userMails.get(senderID);
        if (!email) return reply("⚠️ you haven't generated a mail yet. type 'tempmail gen'.");

        if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
        try {
            // using boomlify wrapper logic as provided in your link
            const res = await axios.get(`https://api.apyhub.com/utility/temp-email/inbox?email=${email}`, {
                headers: { 'apy-token': token }
            });

            const messages = res.data.data;
            if (!messages || messages.length === 0) return reply("📭 inbox is empty.");

            let msg = `📬 **inbox for ${email}**\n━━━━━━━━━━━━━━━━\n`;
            messages.slice(0, 5).forEach((m, i) => {
                msg += `${i + 1}. from: ${m.from}\nsub: ${m.subject}\n\n`;
            });
            
            return reply(msg);
        } catch (e) {
            return reply("❌ failed to fetch inbox.");
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    }

    // 3. clear
    if (action === "clear") {
        userMails.delete(senderID);
        return reply("🧹 temp mail session cleared.");
    }

    reply("❓ usage: tempmail <gen|inbox|clear>");
};
