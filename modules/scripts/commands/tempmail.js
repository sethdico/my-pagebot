const { http } = require("../../utils");
const sessions = new Map();

module.exports.config = {
    name: "tempmail",
    aliases: ["gen", "inbox", "read", "delete"], 
    author: "Sethdico",
    version: "8.0-Delete",
    category: "Utility",
    description: "Temp mail boomify.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, reply, api }) {
    const senderID = event.sender.id;
    const token = process.env.APY_TOKEN;
    if (!token) return reply("❌ APY_TOKEN missing.");

    const bodyText = (event.message?.text || "").toLowerCase();
    let action = args[0]?.toLowerCase();

    // Mapping flow keywords
    if (bodyText.includes("generate")) action = "gen";
    if (bodyText.includes("inbox")) action = "inbox";
    if (bodyText.includes("delete")) action = "delete";

    const session = sessions.get(senderID);

    // 1. READ MESSAGE
    if (action === "read") {
        const index = parseInt(args[1]) - 1;
        if (!session?.lastMessages?.[index]) return reply("⚠️ Not found. Check inbox first.");
        const mail = session.lastMessages[index];
        const body = (mail.body_text || "No text.").substring(0, 500);
        return api.sendButton(`📖 **MSG:**\n${body}`, [{ title: "Back", payload: "tempmail inbox" }], senderID);
    }

    // 2. CHECK INBOX
    if (action === "inbox") {
        if (!session) return reply("⚠️ Generate an email first.");
        try {
            const res = await http.get(`https://api.apyhub.com/boomlify/emails/messages/${session.id}`, { headers: { 'apy-token': token }});
            const msgs = res.data.messages || [];
            if (!msgs.length) return api.sendButton("📭 Inbox empty.", [{ title: "Refresh", payload: "tempmail inbox" }], senderID);
            
            session.lastMessages = msgs;
            sessions.set(senderID, session);
            const list = msgs.slice(0, 3).map((m, i) => `[${i + 1}] ${m.from_name}`).join("\n");
            return api.sendButton(`📬 **Inbox:**\n${list}\n\nType: 'read 1'`, [{ title: "Refresh", payload: "tempmail inbox" }, { title: "Delete", payload: "tempmail delete" }], senderID);
        } catch (e) { return reply("❌ Inbox expired."); }
    }

    // 3. GENERATE EMAIL
    if (action === "gen") {
        try {
            const res = await http.post('https://api.apyhub.com/boomlify/emails/create', {}, { headers: { 'apy-token': token }, params: { time: "1hour" }});
            if (res.data.success) {
                const data = res.data.email;
                sessions.set(senderID, { email: data.address, id: data.id, lastMessages: [] });
                await api.sendButton(`📧 **Address:**\n${data.address}`, [{ title: "Check Inbox", payload: "tempmail inbox" }], senderID);
                return reply(data.address);
            }
        } catch (e) { return reply("❌ API Limit reached."); }
    }

    // 4. DELETE 
    if (action === "delete") {
        if (!session) return reply("🧹 Nothing to delete.");
        try {
            // Attempt to delete from the ApyHub server
            await http.delete(`https://api.apyhub.com/boomlify/emails/${session.id}`, {
                headers: { 'apy-token': token }
            });
        } catch (e) {
            // If server delete fails (expired), we still wipe local session
        }
        sessions.delete(senderID);
        return reply("🗑️ Email deleted and session wiped.");
    }

    // DEFAULT MENU
    const msg = session ? `✅ **Active:**\n${session.email}` : "📧 **TEMP MAIL**\nNeed a private email?";
    const buttons = session 
        ? [{ title: "Check Inbox", payload: "tempmail inbox" }, { title: "Delete", payload: "tempmail delete" }]
        : [{ title: "Generate", payload: "tempmail gen" }];

    return api.sendButton(msg, buttons, senderID);
};
