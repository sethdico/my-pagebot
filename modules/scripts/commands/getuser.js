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

    // 1. VIEW SPECIFIC USER (e.g., getuser 1)
    if (target && !isNaN(target)) {
        const lastList = global.tempUserList.get(senderID);
        if (!lastList) return reply("❌ Please type 'getuser' first to see the list.");

        const user = lastList[parseInt(target) - 1];
        if (!user) return reply("❌ User not found in that list.");

        const isBanned = global.BANNED_USERS.has(user.userId);

        // Simple and clean layout
        const profileMsg = 
            `👤 USER DETAILS\n` +
            `────────────────\n` +
            `Name: ${user.name}\n` +
            `ID: ${user.userId}\n` +
            `Status: ${isBanned ? "Banned" : "Active"}\n\n` +
            
            `Gender: ${user.gender || "Not set"}\n` +
            `Birthday: ${user.birthday || "Not set"}\n` +
            `Location: ${user.locale || "Unknown"}\n\n` +
            
            `Usage: ${user.count} messages\n` +
            `Last Active: ${new Date(user.lastActive).toLocaleString()}\n` +
            `────────────────`;

        const buttons = [
            { 
                type: "postback", 
                title: isBanned ? "Unban User" : "Ban User", 
                payload: isBanned ? `unban ${user.userId}` : `ban ${user.userId}` 
            },
            { 
                type: "web_url", 
                url: user.link || `https://www.facebook.com/${user.userId}`, 
                title: "View Facebook" 
            },
            { 
                type: "postback", 
                title: "Send Message", 
                payload: `call ${user.userId} Admin wants to talk.` 
            }
        ];

        if (user.profilePic) await api.sendAttachment("image", user.profilePic, senderID);
        return api.sendButton(profileMsg, buttons, senderID);
    }

    // 2. SHOW LIST OF RECENT USERS
    try {
        const users = await db.getAllUsers();
        if (!users || users.length === 0) {
            return reply("No users have been active in the last 3 days.");
        }

        global.tempUserList.set(senderID, users);

        let list = "👥 Recent Users (3 Days)\n────────────────\n";
        users.forEach((u, i) => {
            const isBanned = global.BANNED_USERS.has(u.userId);
            list += `${i + 1}. ${isBanned ? "🚫" : "👤"} ${u.name}\n`;
        });

        reply(list + "\n💡 Type 'getuser [number]' for info.");
    } catch (e) {
        reply("❌ Error loading users.");
    }
};
