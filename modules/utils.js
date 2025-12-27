const axios = require("axios");
const https = require("https");

// 1. The HTTP Tool
const http = axios.create({
    timeout: 60000, 
    httpsAgent: new https.Agent({ 
        keepAlive: true,
        rejectUnauthorized: false 
    }),
    headers: { 'User-Agent': 'Amduspage/Bot' }
});

// 2. The "Undefined" Killer
const parseAI = (res) => {
    if (!res || !res.data) return null;
    const d = res.data;
    return d.answer || d.response || d.result || d.message || d.content || (typeof d === 'string' ? d : null);
};

// 3. The Logging Function (RESTORED TO FIX CRASH)
function log(event) {
    if (event.message?.is_echo || !event.sender) return;
    const senderType = global.ADMINS?.has(event.sender.id) ? "ADMIN" : "USER";
    const msg = event.message?.text || event.postback?.payload || "[Media/Attachment]";
    console.log(`[${senderType}] ${event.sender.id}: ${msg}`);
}

// 4. Event Type Detector
function getEventType(event) {
    if (event.postback) return "postback";
    if (event.message) {
        if (event.message.attachments) return "attachment";
        if (event.message.reply_to) return "reply";
        return "text"; 
    }
    return "unknown";
}

// 5. Retry logic for unstable APIs
async function fetchWithRetry(requestFn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try { return await requestFn(); } 
        catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
}

// Ensure all these are exported so webhook.js and commands can see them
module.exports = { http, parseAI, log, getEventType, fetchWithRetry };
