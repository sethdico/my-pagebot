const axios = require("axios");

// RAM storage for sessions: { email, expiresAt, lastMessages }
const sessions = new Map();

module.exports.config = {
    name: "tempmail",
    author: "Sethdico",
    version: "2.1",
    category: "Utility",
    description: "temp mail via boomlify api.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const action = args[0]?.toLowerCase();
    const token = process.env.APY_TOKEN;

    if (!token) return reply("❌ APY_TOKEN missing on Render environment.");

    // --- 1. READ MESSAGE CONTENT ---
    if (action === "read") {
        const session = sessions.get(senderID);
        const index = parseInt(args[1]) - 1;
        
        if (!session || !session.lastMessages) return reply("⚠️ Please check your inbox first.");
        const mail = session.lastMessages[index];
        if (!mail) return reply("❌ Invalid message number.");

        // Clean HTML if text isn't available
        const body = mail.text || mail.html?.replace(/<[^>]*>?/gm, '') || "No content found.";
        
        const readMsg = `📖 **MESSAGE CONTENT**\n━━━━━━━━━━━━━━━━\n👤 **From:** ${mail.from?.address || mail.from}\n📝 **Subject:** ${mail.subject}\n━━━━━━━━━━━━━━━━\n\n${body.substring(0, 1800)}`;
        
        return api.sendButton(readMsg, [
            { type: "postback", title: "📥 Back to Inbox", payload: "tempmail inbox" }
        ], senderID);
    }

    // --- 2. CHECK INBOX ---
    if (action === "inbox" || action === "check") {
        const session = sessions.get(senderID);
        if (!session) return reply("⚠️ No active email. Use 'tempmail gen' first.");

        if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
        try {
            const res = await axios.get(`https://api.apyhub.com/boomlify/emails/inbox`, {
                headers: { 'apy-token': token },
                params: { address: session.email }
            });

            const messages = res.data.items || res.data || [];
            if (messages.length === 0) return reply("📭 Inbox is empty. Try again in a few moments.");

            // Cache messages in RAM so user can read them by index
            session.lastMessages = messages;
            sessions.set(senderID, session);

            let list = `📬 **Inbox for: ${session.email}**\n━━━━━━━━━━━━━━━━\n`;
            messages.slice(0, 5).forEach((m, i) => {
                list += `[${i + 1}] From: ${m.from?.address || m.from}\nSub: ${m.subject}\n\n`;
            });
            list += `━━━━━━━━━━━━━━━━\n💡 Type "tempmail read 1" to see full text.`;
            
            return api.sendButton(list, [
                { type: "postback", title: "🔄 Refresh", payload: "tempmail inbox" },
                { type: "postback", title: "🧹 Clear", payload: "tempmail clear" }
            ], senderID);
        } catch (e) {
            return reply("❌ Failed to fetch inbox.");
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    }

    // --- 3. GENERATE EMAIL ---
    if (action === "gen") {
        if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);
        try {
            const res = await axios.post('https://api.apyhub.com/boomlify/emails/create', {}, {
                headers: { 'apy-token': token },
                params: { time: "1hour" } 
            });

            if (res.data.success) {
                const data = res.data.email;
                sessions.set(senderID, { 
                    email: data.address, 
                    expiresAt: data.expires_at,
                    lastMessages: [] 
                });

                await reply(`📧 **Temporary Email Created**\n━━━━━━━━━━━━━━━━\nAddress: ${data.address}\nExpires: In 1 hour\n━━━━━━━━━━━━━━━━`);
                
                // Send the address alone so user can long-press to copy easily
                await reply(data.address); 

                return api.sendButton("Manage your session:", [
                    { type: "postback", title: "📥 Check Inbox", payload: "tempmail inbox" },
                    { type: "postback", title: "🧹 Clear Session", payload: "tempmail clear" }
                ], senderID);
            }
        } catch (e) {
            return reply("❌ Generation failed. Check your API quota.");
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    }

    // --- 4. CLEAR SESSION ---
    if (action === "clear") {
        sessions.delete(senderID);
        return reply("🧹 Your temp mail session has been cleared.");
    }

    // --- DEFAULT: MAIN MENU ---
    const helpText = `📧 **TempMail Manager**\n\nGenerate disposable emails to protect your privacy and avoid spam.`;
    return api.sendButton(helpText, [
        { type: "postback", title: "✨ Generate Email", payload: "tempmail gen" },
        { type: "postback", title: "📥 Check Inbox", payload: "tempmail inbox" }
    ], senderID);
};
