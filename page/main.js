const utils = require("../modules/utils");
const http = utils.http;

const graphUrl = (id) => `https://graph.facebook.com/v21.0/${id}/messages`;

// Define API wrapper functions
const api = {
    sendMessage: (text, id) => http.post(graphUrl(id), { messaging_type: "RESPONSE", message: { text } }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    sendButton: (text, buttons, id) => http.post(graphUrl(id), { messaging_type: "RESPONSE", message: { attachment: { type: "template", payload: { template_type: "button", text, buttons } } } }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    sendAttachment: (type, url, id) => http.post(graphUrl(id), { messaging_type: "RESPONSE", message: { attachment: { type: type === "image" ? "image" : "file", payload: { url } } } }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    sendTypingIndicator: (state, id) => http.post(graphUrl(id), { sender_action: state ? "typing_on" : "typing_off" }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    sendQuickReply: (text, quickReplies, id) => http.post(graphUrl(id), {
        messaging_type: "RESPONSE",
        message: {
            text,
            quick_replies: quickReplies.map(q => ({ content_type: "text", title: q, payload: q }))
        }
    }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    // Added helper for raw getUserInfo since it was used in commands
    getUserInfo: async (id) => {
        try {
            const res = await http.get(`https://graph.facebook.com/${id}?fields=first_name,last_name,profile_pic&access_token=${global.PAGE_ACCESS_TOKEN}`);
            return res.data;
        } catch (e) { return { first_name: "User" }; }
    }
};

// Main Handler Function
const handleEvent = async (event) => {
    const senderID = event.sender.id;
    if (!global.client.cooldowns.has(senderID)) global.client.cooldowns.set(senderID, new Map());
    
    const now = Date.now();
    const cmdCooldowns = global.client.cooldowns.get(senderID);
    
    let msg = event.message?.text || "";
    const args = msg.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const cmd = global.client.commands.get(commandName) || global.client.commands.get(global.client.aliases.get(commandName));

    if (cmd) {
        if (cmd.config.adminOnly && !global.ADMINS.has(senderID)) return api.sendMessage("❌ Admins only.", senderID);
        
        const cooldownTime = (cmd.config.cooldown || 1) * 1000;
        if (cmdCooldowns.has(cmd.config.name) && cmdCooldowns.get(cmd.config.name) + cooldownTime > now) 
            return api.sendMessage("⏳ Wait.", senderID);

        cmdCooldowns.set(cmd.config.name, now);
        
        try {
            await cmd.run({ event, args, api, reply: (t) => api.sendMessage(t, senderID) });
        } catch (e) { console.error("Cmd Error", e); api.sendMessage("❌ Error.", senderID); }
    }
};

// Export the handler AND the api object
module.exports = handleEvent;
module.exports.api = api;
