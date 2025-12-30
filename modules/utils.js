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

    // 1. CHIPP.AI / OPENAI Standard (The fix for your glitch)
    if (d.choices?.[0]?.message?.content) return d.choices[0].message.content;
    
    // 2. Chipp.ai Error Handling
    if (d.error) return `⚠️ API Error: ${d.error.message || d.error}`;

    // 3. Fallback for other APIs
    let text = d.answer || d.response || d.result || d.message || d.content || (typeof d === 'string' ? d : null);
    
    if (typeof text === 'string' && text.includes("output_done")) {
        const match = text.match(/"text":"(.*?)"/);
        if (match) text = match[1].replace(/\\n/g, '\n');
    }
    return text;
};

// ... [Keep your log, getEventType, fetchWithRetry functions here] ...

module.exports = { http, parseAI, log, getEventType, fetchWithRetry };
