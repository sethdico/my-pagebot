const db = require("../../database");
module.exports.config = { name: "uid", category: "Utility" };

module.exports.run = async ({ event, api, reply }) => {
    const id = event.sender.id;
    try {
        const info = await api.getUserInfo(id);
        const name = `${info.first_name} ${info.last_name}`;
        const dbUser = await db.getUserData(id);
        
        let msg = `🆔 **User Info**\n────────────────\nName: ${name}\nID: ${id}\n`;
        if (dbUser) {
            msg += `Messages: ${dbUser.count}\n`;
            msg += `Last active: ${new Date(dbUser.lastActive).toLocaleDateString()}`;
        }
        
        reply(msg);
        if (info.profile_pic) api.sendAttachment("image", info.profile_pic, id);
    } catch (e) { reply(`🆔 ID: ${id}`); }
};
