const http = require("../../utils");
const sessions = new Map();

module.exports.config = { name: "tempmail", aliases: ["generate", "inbox", "check", "clear"], author: "Sethdico", version: "5.0-Fast", category: "Utility", description: "Disposable email.", adminOnly: false, usePrefix: false, cooldown: 5 };

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const token = process.env.APY_TOKEN;
    if (!token) return reply("❌ APY_TOKEN missing.");

    if (sessions.size > 100) { // Cleanup
        const keys = [...sessions.keys()];
        for(let i=0; i<20; i++) sessions.delete(keys[i]);
    }

    const fullText = (event.message?.text || "").toLowerCase();
    let action = args[0]?.toLowerCase();
    if (fullText.includes("generate")) action = "gen";
    if (fullText.includes("inbox") || fullText.includes("check")) action = "inbox";
    if (fullText.includes("clear")) action = "clear";
    if (fullText.includes("read")) action = "read";

    const session = sessions.get(senderID);

    if (action === "read") {
        const index = parseInt(args[1] || fullText.split("read")[1]) - 1;
        if (!session?.lastMessages?.[index]) return reply("⚠️ Not found.");
        const mail = session.lastMessages[index];
        const body = mail.body_text || mail.body_html?.replace(/<[^>]*>?/gm, '') || "No content.";
        return api.sendQuickReply(`📖 **MSG**\n${mail.from_name}: ${mail.subject}\n\n${body.substring(0,1800)}`, ["Check Inbox", "Clear"], senderID);
    }

    if (action === "inbox") {
        if (!session) return reply("⚠️ No email. Generate one.");
        try {
            const res = await http.get(`https://api.apyhub.com/boomlify/emails/messages/${session.id}`, { headers: { 'apy-token': token }});
            const messages = res.data.messages || [];
            if (!messages.length) return api.sendQuickReply("📭 Empty", ["Check Inbox", "Clear"], senderID);
            
            session.lastMessages = messages;
            sessions.set(senderID, session);
            let list = `📬 Inbox (${messages.length})\n` + messages.slice(0,5).map((m,i)=>`[${i+1}] ${m.from_name}: ${m.subject}`).join("\n");
            return api.sendQuickReply(`${list}\n\nType 'read 1'`, ["Check Inbox", "Clear"], senderID);
        } catch (e) { return reply("❌ Failed."); }
    }

    if (action === "gen") {
        try {
            const res = await http.post('https://api.apyhub.com/boomlify/emails/create', {}, { headers: { 'apy-token': token }, params: { time: "1hour" }});
            if (res.data.success) {
                const data = res.data.email;
                sessions.set(senderID, { email: data.address, id: data.id, lastMessages: [] });
                await api.sendQuickReply(`📧 ${data.address} (Active 1h)`, ["Check Inbox", "Clear"], senderID);
                return;
            }
        } catch (e) { return reply("❌ Limit."); }
    }

    if (action === "clear") {
        if (session) try { http.delete(`https://api.apyhub.com/boomlify/emails/${session.id}`, { headers: { 'apy-token': token }}).catch(()=>{}); } catch(e){}
        sessions.delete(senderID);
        return reply("🧹 Cleared.");
    }

    api.sendQuickReply(session ? `📧 Active: ${session.email}` : "📧 Generate Email?", ["Generate Email", "Check Inbox", "Clear"], senderID);
};
