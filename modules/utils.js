const axios = require("axios");
const https = require("https");

// 1. The HTTP Tool (Optimized for slow APIs)
const http = axios.create({
    timeout: 60000, 
    httpsAgent: new https.Agent({ 
        keepAlive: true, 
        rejectUnauthorized: false 
    }),
    headers: { 'User-Agent': 'Amduspage/Bot' }
});

// 2. The Master Parser (The fix for Chipp.ai and "undefined" errors)
const parseAI = (res) => {
    if (!res || !res.data) return null;
    const d = res.data;

    // Chipp.ai / OpenAI deep JSON path
    if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
    
    // API Error Reporting
    if (d.error) return `⚠️ API Error: ${d.error.message || d.error}`;

    // Standard community API keys
    let text = d.answer || d.response || d.result || d.message || d.content || (typeof d === 'string' ? d : null);
    
    // Clean SSE "output_done" junk (Quillbot fix)
    if (typeof text === 'string' && text.includes("output_done")) {
        const match = text.match(/"text":"(.*?)"/);
        if (match) text = match[1].replace(/\\n/g, '\n');
    }
    return text;
};

// 3. The Logging Function (FIXED: Restored to stop the crash)
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
            // Exponential backoff
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        }
    }
}

// Ensure all these are exported so index.js and commands can see them
module.exports = { http, parseAI, log, getEventType, fetchWithRetry };
