const { http } = require("../../utils");
const sessions = new Map();

module.exports.config = {
    name: "tempmail",
    aliases: ["gen", "inbox", "check", "clear"], 
    author: "Sethdico",
    version: "6.0-Boomlify",
    category: "Utility",
    description: "Disposable email using Boomlify API.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const token = process.env.APY_TOKEN;

    if (!token) return reply("❌ APY_TOKEN is missing in environment variables.");

    const fullText = (event.message?.text || "").toLowerCase();
    let action = args[0]?.toLowerCase();

    // Map common words to internal actions
    if (fullText.includes("generate")) action = "gen";
    if (fullText.includes("inbox") || fullText.includes("check")) action = "inbox";
    if (fullText.includes("clear") || fullText.includes("delete")) action = "clear";
    if (fullText.includes("read")) action = "read";

    const session = sessions.get(senderID);

    // --- 1. READ MESSAGE LOGIC ---
    if (action === "read") {
        const index = parseInt(args[1] || fullText.split("read")[1]) - 1;
        
        if (!session?.lastMessages?.[index]) {
            return reply("⚠️ Can't find that message. Check your inbox first.");
        }

        const mail = session.lastMessages[index];
        const body = mail.body_text || "No text content.";
        
        const readMsg = `📖 **MESSAGE**\n━━━━━━━━━━━━━━━━\n👤 **From:** ${mail.from_name} (${mail.from_email})\n📝 **Subject:** ${mail.subject}\n━━━━━━━━━━━━━━━━\n\n${body.substring(0, 1800)}`;
        
        return api.sendQuickReply(readMsg, ["Check Inbox", "Clear Session"], senderID);
    }

    // --- 2. INBOX LOGIC (Retrieve Messages) ---
    if (action === "inbox") {
        if (!session) return reply("⚠️ You don't have an active email. Type 'tempmail gen'.");

        try {
            // FIXED: Using path parameter for ID as per documentation
            const res = await http.get(`https://api.apyhub.com/boomlify/emails/messages/${session.id}`, {
                headers: { 'apy-token': token }
            });

            const messages = res.data.messages || [];
            
            if (messages.length === 0) {
                return api.sendQuickReply(`📭 **Inbox is Empty**\nEmail: ${session.email}`, ["Check Inbox", "Clear Session"], senderID);
            }

            // Save messages to session so user can 'read' them
            session.lastMessages = messages;
            sessions.set(senderID, session);

            let list = `📬 **INBOX (${messages.length})**\n━━━━━━━━━━━━━━━━\n`;
            messages.slice(0, 5).forEach((m, i) => {
                list += `[${i + 1}] From: ${m.from_name}\nSub: ${m.subject}\n\n`;
            });
            list += `━━━━━━━━━━━━━━━━\n💡 Type: 'read 1' to view.`;
            
            return api.sendQuickReply(list, ["Check Inbox", "Clear Session"], senderID);
        } catch (e) { 
            return reply("❌ Failed to retrieve messages. The email might have expired."); 
        }
    }

    // --- 3. GENERATE LOGIC (Create Email) ---
    if (action === "gen") {
        try {
            // FIXED: POST request to create endpoint
            const res = await http.post('https://api.apyhub.com/boomlify/emails/create', {}, {
                headers: { 'apy-token': token },
                params: { time: "1hour" } // Matches your "Email Lifetime Duration" docs
            });

            if (res.data.success) {
                const data = res.data.email;
                
                sessions.set(senderID, { 
                    email: data.address, 
                    id: data.id, 
                    lastMessages: [] 
                });

                const mainMsg = `📧 **NEW TEMP MAIL**\n━━━━━━━━━━━━━━━━\nAddress: ${data.address}\nStatus: Active (1 Hour)\n━━━━━━━━━━━━━━━━`;
                
                await api.sendQuickReply(mainMsg, ["Check Inbox", "Clear Session"], senderID);
                
                // Send just the address in a second message for easy mobile copying
                setTimeout(() => { reply(data.address); }, 1000);
                return;
            }
        } catch (e) { 
            return reply("❌ API Error: Check your APY_TOKEN or limit."); 
        }
    }

    // --- 4. CLEAR LOGIC (Delete Email) ---
    if (action === "clear") {
        if (!session) return reply("🧹 Nothing to clear.");
        try {
            // FIXED: DELETE request to specific ID path
            await http.delete(`https://api.apyhub.com/boomlify/emails/${session.id}`, {
                headers: { 'apy-token': token }
            });
            
            sessions.delete(senderID);
            return reply("🧹 Inbox deleted and session wiped.");
        } catch (e) {
            sessions.delete(senderID);
            return reply("🧹 Session cleared locally.");
        }
    }

    // --- DEFAULT HELP ---
    const helpHeader = `📧 **TEMP MAIL (Boomlify)**\n━━━━━━━━━━━━━━━━\nGenerate a disposable email to stay anonymous.\n\nType 'gen' or click below:`;

    if (session) {
        return api.sendQuickReply(`${helpHeader}\n\n✅ **Current:** ${session.email}`, ["Check Inbox", "Clear Session"], senderID);
    }

    return api.sendQuickReply(helpHeader, ["Generate Email"], senderID);
};
