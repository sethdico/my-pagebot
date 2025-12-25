const axios = require("axios");

// RAM storage for sessions
const sessions = new Map();

module.exports.config = {
    name: "tempmail",
    author: "Sethdico",
    version: "3.5",
    category: "Utility",
    description: "Professional disposable email service via Boomlify.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const token = process.env.APY_TOKEN;

    if (!token) return reply("❌ APY_TOKEN missing in environment.");

    // This part fixes the AI Fallback issue by recognizing the Quick Reply text
    const rawInput = (args.join(" ") || "").toLowerCase();
    let action = args[0]?.toLowerCase();

    if (rawInput.includes("generate email") || rawInput.includes("gen")) action = "gen";
    if (rawInput.includes("check inbox") || rawInput.includes("refresh")) action = "inbox";
    if (rawInput.includes("clear session")) action = "clear";
    if (rawInput.startsWith("read")) action = "read";

    const session = sessions.get(senderID);

    // --- 1. ACTION: READ ---
    if (action === "read") {
        const index = parseInt(args[1] || args[0].split(" ")[1]) - 1;
        if (!session?.lastMessages?.[index]) return reply("⚠️ Message not found. Check inbox first.");

        const mail = session.lastMessages[index];
        const body = mail.text || mail.html?.replace(/<[^>]*>?/gm, '') || "No content.";
        
        const readMsg = `📖 **MESSAGE CONTENT**\n━━━━━━━━━━━━━━━━\n👤 **From:** ${mail.from?.address || mail.from}\n📝 **Subject:** ${mail.subject}\n━━━━━━━━━━━━━━━━\n\n${body.substring(0, 1800)}`;
        
        return api.sendQuickReply(readMsg, ["Check Inbox", "Clear Session"], senderID);
    }

    // --- 2. ACTION: INBOX (Resilient Logic) ---
    if (action === "inbox") {
        if (!session) return reply("⚠️ No active session found. Generate one first.");

        try {
            const res = await axios.get(`https://api.apyhub.com/boomlify/emails/inbox`, {
                headers: { 'apy-token': token },
                params: { address: session.email }
            });

            const messages = res.data.items || res.data.data || (Array.isArray(res.data) ? res.data : []);
            
            if (messages.length === 0) {
                return api.sendQuickReply(`📭 **Inbox is empty**\nAddress: ${session.email}\n\nWaiting for incoming mail...`, ["Check Inbox", "Clear Session"], senderID);
            }

            session.lastMessages = messages;
            sessions.set(senderID, session);

            let list = `📬 **INBOX: ${session.email}**\n━━━━━━━━━━━━━━━━\n`;
            messages.slice(0, 5).forEach((m, i) => {
                list += `[${i + 1}] From: ${m.from?.address || m.from}\nSub: ${m.subject}\n\n`;
            });
            list += `━━━━━━━━━━━━━━━━\n💡 To read, type: tempmail read [number]`;
            
            return api.sendQuickReply(list, ["Check Inbox", "Clear Session"], senderID);
        } catch (e) { 
            console.error(e.response?.data);
            return reply("❌ API Error: Failed to fetch inbox."); 
        }
    }

    // --- 3. ACTION: GENERATE ---
    if (action === "gen") {
        try {
            const res = await axios.post('https://api.apyhub.com/boomlify/emails/create', {}, {
                headers: { 'apy-token': token },
                params: { time: "1hour" } 
            });

            if (res.data.success) {
                const data = res.data.email;
                sessions.set(senderID, { 
                    email: data.address, 
                    id: data.id, 
                    lastMessages: [] 
                });

                const mainMsg = `📧 **DISPOSABLE EMAIL CREATED**\n━━━━━━━━━━━━━━━━\nAddress: ${data.address}\nStatus: Active (1 Hour)\n━━━━━━━━━━━━━━━━\nUse the address below to sign up.`;
                
                await api.sendQuickReply(mainMsg, ["Check Inbox", "Clear Session"], senderID);
                setTimeout(() => { reply(data.address); }, 1500);
                return;
            }
        } catch (e) { return reply("❌ Failed to generate email. Check API credits."); }
    }

    // --- 4. ACTION: CLEAR ---
    if (action === "clear") {
        sessions.delete(senderID);
        return reply("🧹 Session cleared successfully.");
    }

    // --- 5. PROFESSIONAL HELP MENU ---
    const helpHeader = 
        `📧 **TEMP-MAIL UTILITY**\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `Generate temporary, disposable email addresses to prevent spam and protect your privacy.\n\n` +
        `🔹 **Commands:**\n` +
        `• tempmail gen - Create new mail\n` +
        `• tempmail inbox - Check messages\n` +
        `• tempmail read [n] - Read a specific mail\n` +
        `• tempmail clear - Wipe current session\n` +
        `━━━━━━━━━━━━━━━━`;

    if (session) {
        return api.sendQuickReply(`${helpHeader}\n\n✅ **Current Active Mail:**\n${session.email}`, ["Check Inbox", "Clear Session"], senderID);
    }

    return api.sendQuickReply(helpHeader, ["Generate Email"], senderID);
};
