module.exports.config = {
    name: "dashboard", 
    aliases: ["admin", "panel"],
    author: "Sethdico", 
    category: "Admin", 
    adminOnly: true, 
    usePrefix: false
};

module.exports.run = async function ({ event, api }) {
    const buttons = [
        { type: "postback", title: "stats", payload: "stats" },
        { type: "postback", title: "users", payload: "getuser" },
        { type: "postback", title: "maintenance", payload: "maintenance" },
        { type: "postback", title: "ban list", payload: "banlist" }
    ];
    return api.sendButton("admin panel", buttons, event.sender.id);
};
