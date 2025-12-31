const db = require("../../database");

global.tempUserList = global.tempUserList || new Map();

module.exports.config = {
    name: "getuser",
    author: "Sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const target = args[0];

    // SELECT USER BY INDEX (e.g., getuser 1)
    if (target && !isNaN(target)) {
        const lastList = global.tempUserList.get(senderID);
        if (!lastList) return reply("❌ Type 'getuser' first.");

        const user = lastList[parseInt(target) - 1];
        if (!user) return reply("❌ User not found.");

        // Calculate Membership Duration
        const joined = new Date(user.firstSeen);
        const diffDays = Math.floor((Date.now() - joined) / (1000 * 60 * 60 * 24));
        
        // Check Ban Status
        const isBanned = global.BANNED_USERS.has(user.userId);

        const profileMsg = 
            `🕵️ **USER INTELLIGENCE REPORT**\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `👤 **NAME:** ${user.name}\n` +
            `🆔 **UID:** ${user.userId}\n` +
            `🛡️ **STATUS:** ${isBanned ? "🚫 BANNED" : "✅ ACTIVE"}\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `⚧ **GENDER:** ${user.gender || "Unknown"}\n` +
            `🎂 **BIRTHDAY:** ${user.birthday || "Not Set"}\n` +
            `🌐 **LANGUAGE:** ${user.locale || "Unknown"}\n` +
            `🌍 **TIMEZONE:** UTC ${user.timezone > 0 ? "+" : ""}${user.timezone}\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `📅 **MEMBER SINCE:** ${joined.toLocaleDateString()}\n` +
            `⏳ **MEMBERSHIP:** ${diffDays} days\n` +
            `📈 **TOTAL CMDS:** ${user.count}\n` +
            `🕒 **LAST SEEN:** ${new Date(user.lastActive).toLocaleString()}\n` +
            `🔗 **LINK:** fb.com/${user.userId}`;

        const buttons = [
            { type: "postback", title: isBanned ? "✅ UNBAN" : "🚫 BAN", payload: isBanned ? `unban ${user.userId}` : `ban ${user.userId}` },
            { type: "postback", title: "📢 MESSAGE", payload: `call ${user.userId} Admin is calling...` }
        ];

        if (user.profilePic) await api.sendAttachment("image", user.profilePic, senderID);
        return api.sendButton(profileMsg, buttons, senderID);
    }

    // SHOW RECENT LIST
    const users = await db.getAllUsers();
    if (users.length === 0) return reply("No data found.");

    global.tempUserList.set(senderID, users);

    let list = "👥 **ADMIN PANEL: USER LIST**\n━━━━━━━━━━━━━━━━\n";
    users.forEach((u, i) => {
        const isBanned = global.BANNED_USERS.has(u.userId);
        list += `${i + 1}. ${isBanned ? "🚫 " : "👤 "}${u.name}\n   ID: ${u.userId}\n\n`;
    });

    reply(list + "💡 Reply with 'getuser [number]' for full dossier.");
};
