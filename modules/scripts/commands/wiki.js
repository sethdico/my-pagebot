const axios = require("axios");

// === IN-MEMORY CACHE (O(1) Access) ===
// Stores results for 1 hour to prevent spamming Wikipedia API
const wikiCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; 

// Simple header to be polite to Wikipedia API
const HEADERS = {
    'User-Agent': 'Amdusbot/4.0 (FacebookBot; contact: your-email@example.com)'
};

module.exports.config = {
    name: "wiki",
    author: "Sethdico (Optimized)",
    version: "4.0-SmartSearch",
    category: "Utility",
    description: "Smart Wiki: Auto-corrects text, supports PDF & Multilingual.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 3,
};

module.exports.run = async function ({ event, args, api }) {
    const senderID = event.sender.id;
    let query = args.join(" ").trim();
    let lang = "en"; // Default

    // 1. HELP MENU
    if (!query) {
        return api.sendMessage(
            "📚 **Wiki Guide**\n━━━━━━━━━━━━━━━━\n" +
            "🔍 **Search:** `wiki Goodnight Punpun` (Case insensitive)\n" +
            "🇵🇭 **Tagalog:** `wiki tl Jose Rizal`\n" +
            "📅 **History:** `wiki today`\n" +
            "📄 **PDF:** `wiki pdf gravity`\n" +
            "🎲 **Random:** `wiki random`", 
            senderID
        );
    }

    // 2. FEATURE: ON THIS DAY
    if (query.toLowerCase() === "today") return handleOnThisDay(api, senderID);

    // 3. FEATURE: RANDOM
    if (query.toLowerCase() === "random") return handleRandom(api, senderID, "en");

    // 4. LANGUAGE DETECTION (e.g., "wiki tl ...")
    // If first word is 2 letters and matches a language code pattern
    if (args[0].length === 2 && args.length > 1) {
        const potentialLang = args[0].toLowerCase();
        // Simple validation: strictly 2 letters
        if (/^[a-z]{2}$/.test(potentialLang)) {
            lang = potentialLang;
            query = args.slice(1).join(" ");
        }
    }

    // 5. FEATURE: PDF
    let isPdf = false;
    if (args[0].toLowerCase() === "pdf") {
        isPdf = true;
        query = args.slice(1).join(" ");
    }

    // Fire and forget typing
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(()=>{});

    // 6. CHECK CACHE
    const cacheKey = `${lang}_${query.toLowerCase()}`;
    if (!isPdf && wikiCache.has(cacheKey)) {
        const cached = wikiCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`🚀 Serving Wiki cache: ${query}`);
            return sendWikiResult(api, senderID, cached.data);
        } else {
            wikiCache.delete(cacheKey); // Expired
        }
    }

    // 7. EXECUTE SMART SEARCH
    try {
        // STEP A: Perform an "OpenSearch" to find the CORRECT title/slug
        // This fixes the "case sensitive" issue. 
        // Input: "goodnight punpun" -> Output: "Goodnight Punpun"
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php`;
        const searchRes = await axios.get(searchUrl, {
            params: {
                action: "opensearch",
                search: query,
                limit: 1,
                namespace: 0,
                format: "json"
            }
        });

        // opensearch returns: [query, [Titles], [Descriptions], [Links]]
        if (!searchRes.data[1] || searchRes.data[1].length === 0) {
            return api.sendMessage(`❌ No results found for "${query}" in ${lang.toUpperCase()}.`, senderID);
        }

        const correctTitle = searchRes.data[1][0]; // The official Wikipedia title
        
        // STEP B: Handle PDF Request
        if (isPdf) {
            const pdfUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/pdf/${encodeURIComponent(correctTitle)}`;
            const buttons = [{ type: "web_url", url: pdfUrl, title: "📥 Download PDF" }];
            return api.sendButton(`📄 **PDF Ready**\nOfficial PDF for "${correctTitle}".`, buttons, senderID);
        }

        // STEP C: Fetch Summary using the Correct Title
        const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(correctTitle)}`;
        const summaryRes = await axios.get(summaryUrl, { headers: HEADERS });
        const data = summaryRes.data;

        // Disambiguation handling
        if (data.type === "disambiguation") {
            return api.sendMessage(`⚠️ **Ambiguous:** "${correctTitle}" refers to multiple things. Please be more specific.`, senderID);
        }

        // Save to Cache
        wikiCache.set(cacheKey, { data: data, timestamp: Date.now() });

        // Output
        await sendWikiResult(api, senderID, data);

    } catch (error) {
        console.error("Wiki Error:", error.message);
        api.sendMessage("❌ Wiki is currently unavailable or the topic doesn't exist.", senderID);
    }
};

// ============================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================

async function sendWikiResult(api, senderID, data) {
    const title = data.title;
    const summary = data.extract || "No description available.";
    const pageUrl = data.content_urls.desktop.page;
    const imgUrl = data.originalimage?.source || data.thumbnail?.source;

    // Send Image if exists
    if (imgUrl) {
        // Fire and forget image to make text appear faster
        api.sendAttachment("image", imgUrl, senderID).catch(()=>{});
    }

    const buttons = [{ type: "web_url", url: pageUrl, title: "📖 Read Article" }];
    const msg = `📚 **${title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n${summary}`;

    await api.sendButton(msg, buttons, senderID);
}

async function handleOnThisDay(api, senderID) {
    try {
        const date = new Date();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');

        const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`;
        const res = await axios.get(url, { headers: HEADERS });
        
        // Get 3 Random Events to keep it fresh
        const events = res.data.selected.sort(() => 0.5 - Math.random()).slice(0, 3);
        
        let msg = `📅 **ON THIS DAY (${mm}/${dd})**\n━━━━━━━━━━━━━━━━\n`;
        events.forEach(e => msg += `• **${e.year}**: ${e.text}\n\n`);

        const buttons = [{ type: "web_url", url: res.data.content_urls?.desktop?.page || "https://en.wikipedia.org", title: "📜 Full List" }];
        api.sendButton(msg, buttons, senderID);
    } catch (e) {
        api.sendMessage("❌ Failed to fetch history.", senderID);
    }
}

async function handleRandom(api, senderID, lang) {
    try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`;
        const res = await axios.get(url, { headers: HEADERS });
        sendWikiResult(api, senderID, res.data);
    } catch (e) {
        api.sendMessage("❌ Random fetch failed.", senderID);
    }
}
