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

async function fetchWithRetry(requestFn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try { return await requestFn(); } 
        catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
}

module.exports = { http, parseAI, log, getEventType, fetchWithRetry };
