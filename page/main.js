const utils = require("../modules/utils");
const handler = require("./handler"); 
const http = utils.http;

const api = {
    sendMessage: (text, id) => http.post(`https://graph.facebook.com/v21.0/me/messages`, { 
        recipient: { id }, message: { text }, messaging_type: "RESPONSE" 
    }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),
    
    sendButton: (text, buttons, id) => http.post(`https://graph.facebook.com/v21.0/me/messages`, {
        recipient: { id }, message: { attachment: { type: "template", payload: { template_type: "button", text, buttons } } }
    }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),

    sendAttachment: (type, url, id) => http.post(`https://graph.facebook.com/v21.0/me/messages`, {
        recipient: { id }, message: { attachment: { type: type === "image" ? "image" : "file", payload: { url } } }
    }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),

    sendTypingIndicator: (state, id) => http.post(`https://graph.facebook.com/v21.0/me/messages`, {
        recipient: { id }, sender_action: state ? "typing_on" : "typing_off"
    }, { params: { access_token: global.PAGE_ACCESS_TOKEN }}),

    getUserInfo: async (id) => {
        try {
            const res = await http.get(`https://graph.facebook.com/${id}?fields=first_name,last_name&access_token=${global.PAGE_ACCESS_TOKEN}`);
            return res.data;
        } catch (e) { return { first_name: "User" }; }
    }
};

module.exports = async (event) => {
    try { await handler(event, api); } catch (e) { console.error("Handler Error:", e.message); }
};
