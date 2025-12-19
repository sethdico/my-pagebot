module.exports.config = {
    name: "uid",
    author: "Sethdico (Ported)",
    version: "1.0",
    category: "Utility",
    description: "Get User ID",
    adminOnly: false,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = function ({ event }) {
    api.sendMessage(`🆔 Your ID: ${event.sender.id}`, event.sender.id);
};
