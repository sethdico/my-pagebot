const db = require("../core/database");

global.tempUserList = global.tempUserList || new Map();

module.exports.config = {
    name: "getuser",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const index = args[0];

    // check specific user
    if (index && !isNaN(index)) {
        const list = global.tempUserList.get(senderID);
        if (!list) return reply("type getuser first");

        const user = list[parseInt(index) - 1];
        if (!user) return reply("not in the list");

        const banned = global.BANNED_USERS.has(user.userId);
        
        let msg = `name: ${user.name}\nid: ${user.userId}\nstatus: ${banned ? "banned" : "active"}\n`;
        msg += `msgs: ${user.count || 0}\n`;
        msg += `active: ${new Date(user.lastActive).toLocaleDateString()}`;

        const btns = [
            { type: "web_url", url: `https://www.facebook.com/messages/t/${user.userId}`, title: "open chat" },
            { type: "postback", title: banned ? "unban" : "ban", payload: banned ? `unban ${user.userId}` : `ban ${user.userId}` }
        ];

        if (user.profilePic) api.sendAttachment("image", user.profilePic, senderID).catch(()=>{});
        return api.sendButton(msg, btns, senderID);
    }

    // list users
    try {
        const all = await db.getAllUsers();
        const others = all.filter(u => u.userId !== senderID).slice(0, 15);

        if (others.length === 0) return reply("no users yet");

        const updated = await Promise.all(
            others.map(async (u) => {
                // if name is generic, try a fresh fetch
                if (!u.name || u.name === "user" || u.name === "Unknown User") {
                    const fb = await api.getUserInfo(u.userId);
                    if (fb) {
                        u.name = fb.name;
                        u.profilePic = fb.pic;
                        db.syncUser(u.userId, fb); // update db quietly
                    } else {
                        u.name = "new user";
                    }
                }
                return u;
            })
        );

        global.tempUserList.set(senderID, updated);

        let txt = "recent users\n\n";
        updated.forEach((u, i) => {
            const isBanned = global.BANNED_USERS.has(u.userId);
            txt += `${i + 1}. ${isBanned ? "🚫 " : ""}${u.name} (${u.count || 0})\n`;
        });
        txt += "\ntype getuser [number] to see profile link";
        
        reply(txt);
    } catch (e) {
        reply("error getting list");
    }
};
