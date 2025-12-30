const axios = require("axios");
const https = require("https");

const http = axios.create({
    timeout: 60000, 
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    headers: { 'User-Agent': 'Amduspage/Bot' }
});

const parseAI = (res) => {
    if (!res || !res.data) return null;
    const d = res.data;
    if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
    let text = d.answer || d.response || d.result || d.message || d.content || (typeof d === 'string' ? d : null);
    if (typeof text === 'string' && text.includes("output_done")) {
        const match = text.match(/"text":"(.*?)"/);
        if (match) text = match[1].replace(/\\n/g, '\n');
    }
    return text;
};

//  Makes the bot feel more human
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

const humanTyping = async (api, id, text) => {
    if (!api.sendTypingIndicator) return;
    await api.sendTypingIndicator(true, id);
    // Average human types 200ms per character, we'll do a scaled delay max 3s
    const delay = Math.min(text.length * 10, 3000);
    await sleep(delay);
    await api.sendTypingIndicator(false, id);
};

function log(event) {
    if (event.message?.is_echo || !event.sender) return;
    const senderType = global.ADMINS?.has(event.sender.id) ? "ADMIN" : "USER";
    console.log(`[${senderType}] ${event.sender.id}: ${event.message?.text || "Media"}`);
}

function getEventType(event) {
    if (event.postback) return "postback";
    if (event.message) {
        if (event.message.attachments) return "attachment";
        if (event.message.reply_to) return "reply";
        return "text"; 
    }
    return "unknown";
}

module.exports = { http, parseAI, log, getEventType, humanTyping, sleep };
