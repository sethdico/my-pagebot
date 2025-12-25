const axios = require("axios");
const https = require("https");

// create a fast connection instance
// keepAlive: true means we reuse the connection (way faster)
const http = axios.create({
    timeout: 20000,
    httpsAgent: new https.Agent({ keepAlive: true }),
    headers: { 'User-Agent': 'Amduspage/Bot' }
});

function getEventType(event) {
    // simple check to see what kind of msg this is
    if (event.postback) return "postback";
    if (event.message) {
        if (event.message.attachments) return "attachment";
        if (event.message.reply_to) return "reply";
        return "text"; // normal text
    }
    return "unknown";
}

function log(event) {
    if (event.message?.is_echo) return;
    const sender = global.ADMINS.has(event.sender?.id) ? "ADMIN" : "USER";
    console.log(`[${sender}] Msg received`);
}

module.exports = { http, log, getEventType };
