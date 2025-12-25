const axios = require("axios");

// RAM storage for sessions: { email, id, lastMessages }
const sessions = new Map();

module.exports.config = {
    name: "tempmail",
    // 1. ALIASES FIXED: This stops the AI from responding to button clicks
    aliases: ["generate", "inbox", "check", "clear"], 
    author: "Sethdico",
    version: "5.0",
    category: "Utility",
    description: "Professional disposable email service via Boomlify.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const token = process.env.APY_TOKEN;

    if (!token) return reply("❌ APY_TOKEN is missing in Render environment.");

    // --- 2. SMART ROUTING ---
    // Detects both typed commands and button clicks to prevent AI Fallback
    const fullText = (event.message?.text || "").toLowerCase();
    let action = args[0]?.toLowerCase();

    if (fullText.includes("generate")) action = "gen";
    if (fullText.includes("inbox") || fullText.includes("check")) action = "inbox";
    if (fullText.includes("clear")) action = "clear";
    if (fullText.includes("read")) action = "read";

    const session = sessions.get(senderID);

    // --- ACTION: READ MESSAGE ---
    if (action === "read") {
        const index = parseInt(args[1] || fullText.split("read")[1]) - 1;
        if (!session?.lastMessages?.[index]) return reply("⚠️ Message not found. Refresh your inbox first.");

        const mail = session.lastMessages[index];
        // Based on docs: body_text or body_html
        const body = mail.body_text || mail.body_html?.replace(/<[^>]*>?/gm, '') || "No content found.";
        
        const readMsg = `📖 **MESSAGE CONTENT**\n━━━━━━━━━━━━━━━━\n👤 **From:** ${mail.from_name || "Unknown"} (${mail.from_email})\n📝 **Subject:** ${mail.subject}\n━━━━━━━━━━━━━━━━\n\n${body.substring(0, 1800)}`;
        
        return api.sendQuickReply(readMsg, ["Check Inbox", "Clear Session"], senderID);
    }

    // --- ACTION: INBOX (Fixed Path Parameter) ---
    if (action === "inbox") {
        if (!session) return reply("⚠️ No active email. Tap 'Generate Email' below.");

        try {
            // DOCS FIX: The ID must be in the URL path, not a query parameter
            const res = await axios.get(`https://api.apyhub.com/boomlify/emails/messages/${session.id}`, {
                headers: { 'apy-token': token },
                timeout: 20000
            });

            const messages = res.data.messages || [];
            
            if (messages.length === 0) {
                return api.sendQuickReply(`📭 **Inbox is Empty**\nAddress: ${session.email}\n\nNo messages yet. Try checking again in 20 seconds.`, ["Check Inbox", "Clear Session"], senderID);
            }

            session.lastMessages = messages;
            sessions.set(senderID, session);

            let list = `📬 **INBOX: ${session.email}**\n━━━━━━━━━━━━━━━━\n`;
            messages.slice(0, 5).forEach((m, i) => {
                list += `[${i + 1}] From: ${m.from_name || "Unknown"}\nSub: ${m.subject}\n\n`;
            });
            list += `━━━━━━━━━━━━━━━━\n💡 To read, type: tempmail read [number]`;
            
            return api.sendQuickReply(list, ["Check Inbox", "Clear Session"], senderID);
        } catch (e) { 
            console.error("Inbox Error:", e.response?.data || e.message);
            return reply("❌ Failed to fetch inbox. The email may have expired."); 
        }
    }

    // --- ACTION: GENERATE ---
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
                    id: data.id, // UUID for path parameters
                    lastMessages: [] 
                });

                const mainMsg = `📧 **DISPOSABLE EMAIL CREATED**\n━━━━━━━━━━━━━━━━\nAddress: ${data.address}\nStatus: Active (1 Hour)\n━━━━━━━━━━━━━━━━\nUse the address below to receive mail:`;
                
                await api.sendQuickReply(mainMsg, ["Check Inbox", "Clear Session"], senderID);
                
                // Anti-spam delay: 1.5s before sending raw address
                setTimeout(() => { reply(data.address); }, 1500);
                return;
            }
        } catch (e) { 
            console.error("Gen Error:", e.response?.data || e.message);
            return reply("❌ Failed to generate. Check your APY_TOKEN quota."); 
        }
    }

    // --- ACTION: CLEAR (Fixed Path Parameter) ---
    if (action === "clear") {
        if (!session) return reply("🧹 No active session to clear.");
        try {
            await axios.delete(`https://api.apyhub.com/boomlify/emails/${session.id}`, {
                headers: { 'apy-token': token }
            });
            sessions.delete(senderID);
            return reply("🧹 Session wiped and email deleted.");
        } catch (e) {
            sessions.delete(senderID);
            return reply("🧹 Session cleared locally.");
        }
    }

    // --- ACTION: PROFESSIONAL HELP ---
    const helpHeader = 
        `📧 **TEMP-MAIL UTILITY**\n` +
        `━━━━━━━━━━━━━━━━\n` +
        `Generate temporary email addresses to protect your privacy and stay safe from spam.\n\n` +
        `🔹 **Commands:**\n` +
        `• tempmail gen - Create new mail\n` +
        `• tempmail inbox - Check messages\n` +
        `• tempmail read [n] - Read a specific mail\n` +
        `• tempmail clear - Wipe session\n` +
        `━━━━━━━━━━━━━━━━`;

    if (session) {
        return api.sendQuickReply(`${helpHeader}\n\n✅ **Current Active Mail:**\n${session.email}`, ["Check Inbox", "Clear Session"], senderID);
    }

    return api.sendQuickReply(helpHeader, ["Generate Email"], senderID);
};
