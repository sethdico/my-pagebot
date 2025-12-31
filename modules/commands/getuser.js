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
    const num = args[0];

    // checking specific user
    if (num && !isNaN(num)) {
        const list = global.tempUserList.get(senderID);
        if (!list) return reply("type getuser first lol");

        const user = list[parseInt(num) - 1];
        if (!user) return reply("user not found");

        // grab fresh info from fb
        let fb = null;
        try { fb = await api.getUserInfo(user.userId); } catch (e) {}

        const banned = global.BANNED_USERS.has(user.userId);
        const name = fb?.name || user.name || "unknown";
        const pic = fb?.profile_pic || user.profilePic;
        const gender = fb?.gender || user.gender || "not set";
        const tz = fb?.timezone || user.timezone;
        
        let msg = `${name}\nid: ${user.userId}\n${banned ? "banned" : "active"}\n\n`;
        msg += `gender: ${gender}\n`;
        if (tz !== undefined) msg += `timezone: utc${tz > 0 ? '+' : ''}${tz}\n`;
        msg += `\nmessages: ${user.count}\n`;
        msg += `last active: ${new Date(user.lastActive).toLocaleDateString()}`;

        const btns = [
            { type: "postback", title: banned ? "unban" : "ban", payload: banned ? `unban ${user.userId}` : `ban ${user.userId}` },
            { type: "web_url", url: `https://m.me/${user.userId}`, title: "chat" }
        ];

        if (pic) api.sendAttachment("image", pic, senderID).catch(()=>{});
        return api.sendButton(msg, btns, senderID);
    }

    // show user list
    try {
        const all = await db.getAllUsers();
        if (!all || all.length === 0) return reply("nobody active rn");

        const others = all.filter(u => u.userId !== senderID);
        if (others.length === 0) return reply("just you, nobody else");

        // get names
        const updated = await Promise.all(
            others.map(async (u) => {
                try {
                    const fb = await api.getUserInfo(u.userId);
                    return { ...u, name: fb?.name || u.name || "unknown" };
                } catch (e) {
                    return { ...u, name: u.name || "unknown" };
                }
            })
        );

        global.tempUserList.set(senderID, updated);

        let txt = "recent users\n\n";
        updated.forEach((u, i) => {
            const banned = global.BANNED_USERS.has(u.userId);
            txt += `${i + 1}. ${banned ? "🚫" : ""} ${u.name} (${u.count})\n`;
        });
        txt += `\ntype 'getuser [number]' for info`;
        
        reply(txt);
    } catch (e) {
        reply("couldn't load users");
    }
};
