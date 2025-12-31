const db = require("../../database");

// Stores the last list shown to each admin for the index selection
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

    // 1. DETAILED VIEW BY INDEX (e.g., "getuser 1")
    if (target && !isNaN(target)) {
        const lastList = global.tempUserList.get(senderID);
        if (!lastList) return reply("❌ Please type 'getuser' first to see the active list.");

        const user = lastList[parseInt(target) - 1];
        if (!user) return reply("❌ Invalid user number.");

        // Calculate Membership Age
        const joined = new Date(user.firstSeen || Date.now());
        const diffDays = Math.floor((Date.now() - joined) / (1000 * 60 * 60 * 24));
        
        // Check current Ban status
        const isBanned = global.BANNED_USERS.has(user.userId);

        const profileMsg = 
            `🕵️ **USER INTELLIGENCE DOSSIER**\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 **NAME:** ${user.name}\n` +
            `🆔 **UID:** ${user.userId}\n` +
            `🛡️ **STATUS:** ${isBanned ? "🚫 BANNED" : "✅ ACTIVE"}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚧ **GENDER:** ${user.gender || "Unknown"}\n` +
            `🎂 **BIRTHDAY:** ${user.birthday || "Private/Not Set"}\n` +
            `🌐 **LANG:** ${user.locale || "Unknown"}\n` +
            `🌍 **TIMEZONE:** UTC ${user.timezone >= 0 ? "+" : ""}${user.timezone}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📅 **JOINED:** ${joined.toLocaleDateString()}\n` +
            `📈 **TOTAL ACTIVITY:** ${user.count} messages\n` +
            `🕒 **LAST ACTIVE:** ${new Date(user.lastActive).toLocaleString()}\n\n` +
            `💡 *User has been active within the last 3 days.*`;

        // Profile link fallback logic
        const profileUrl = user.link || `https://www.facebook.com/${user.userId}`;

        const buttons = [
            { 
                type: "postback", 
                title: isBanned ? "✅ UNBAN" : "🚫 BAN", 
                payload: isBanned ? `unban ${user.userId}` : `ban ${user.userId}` 
            },
            { 
                type: "web_url", 
                url: profileUrl, 
                title: "🌐 VIEW PROFILE" 
            },
            { 
                type: "postback", 
                title: "📢 CALL USER", 
                payload: `call ${user.userId} Admin is requesting your attention.` 
            }
        ];

        // Send profile pic first if available
        if (user.profilePic) {
            await api.sendAttachment("image", user.profilePic, senderID);
        }

        return api.sendButton(profileMsg, buttons, senderID);
    }

    // 2. SHOW LIST OF ACTIVE USERS (Last 3 Days)
    try {
        const users = await db.getAllUsers(); // This uses the 3-day filter logic
        if (!users || users.length === 0) {
            return reply("ℹ️ No users have been active in the last 3 days.");
        }

        // Cache this specific list for the admin
        global.tempUserList.set(senderID, users);

        let list = "👥 **ACTIVE USERS (LAST 3 DAYS)**\n━━━━━━━━━━━━━━━━━━━━\n";
        users.forEach((u, i) => {
            const isBanned = global.BANNED_USERS.has(u.userId);
            const statusIcon = isBanned ? "🚫" : "👤";
            list += `${i + 1}. ${statusIcon} ${u.name}\n   ID: ${u.userId}\n\n`;
        });

        reply(list + "💡 Type 'getuser [number]' for full details and profile link.");
    } catch (e) {
        reply("❌ Error fetching active user list.");
        console.error(e);
    }
};
