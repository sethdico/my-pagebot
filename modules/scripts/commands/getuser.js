module.exports.config = {
    name: "getuser", author: "Sethdico", category: "Admin", adminOnly: true, usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    const db = require("../../database");
    const targetID = args[0];

    if (targetID) {
        try {
            const info = await api.getUserInfo(targetID);
            const msg = `👤 **USER:** ${info.first_name} ${info.last_name}\n🆔 **UID:** ${targetID}\n\nActions:`;
            const buttons = [
                { type: "postback", title: "🚫 BAN", payload: `ban ${targetID}` },
                { type: "postback", title: "✅ UNBAN", payload: `unban ${targetID}` }
            ];
            if (info.profile_pic) await api.sendAttachment("image", info.profile_pic, event.sender.id);
            return api.sendButton(msg, buttons, event.sender.id);
        } catch (e) { return reply("❌ User not found."); }
    }

    const users = await db.getAllUsers();
    let list = "👥 **ACTIVE USERS**\n━━━━━━━━━━━━━━━━\n";
    users.forEach((u, i) => list += `${i+1}. ${u.name}\nID: ${u.userId}\n\n`);
    reply(list + "💡 Type 'getuser [ID]' to manage.");
};
