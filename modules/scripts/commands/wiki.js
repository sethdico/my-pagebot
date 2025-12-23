const axios = require("axios");

// Cache Map (O(1))
const wikiCache = new Map();
const CACHE_TTL = 3600000; // 1 Hour

const HEADERS = { 'User-Agent': 'Amdusbot/4.0' };

module.exports.config = {
    name: "wiki",
    author: "Sethdico (Carousel-Mode)",
    version: "4.5",
    category: "Utility",
    description: "Wikipedia.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const senderID = event.sender.id;
    let query = args.join(" ").trim();
    let lang = "en";

    // Language switch
    if (args[0]?.length === 2 && args.length > 1) {
        if (/^[a-z]{2}$/.test(args[0])) {
            lang = args[0].toLowerCase();
            query = args.slice(1).join(" ");
        }
    }

    if (!query) return api.sendMessage("🔍 Usage: wiki <topic>", senderID);
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(()=>{});

    // Check Cache
    const cacheKey = `${lang}_${query.toLowerCase()}`;
    if (wikiCache.has(cacheKey)) {
        const cached = wikiCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return api.sendCarousel(cached.elements, senderID);
        }
    }

    try {
        // 1. Smart Search (OpenSearch) to get correct title
        const searchRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
            params: { action: "opensearch", search: query, limit: 1, namespace: 0, format: "json" }
        });

        if (!searchRes.data[1]?.length) return api.sendMessage(`❌ No results for "${query}".`, senderID);
        const correctTitle = searchRes.data[1][0];

        // 2. Fetch Summary (Main Card)
        const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(correctTitle)}`;
        const summaryRes = await axios.get(summaryUrl, { headers: HEADERS });
        const mainData = summaryRes.data;

        // 3. Fetch Related Pages (Next Cards)
        const relatedUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/related/${encodeURIComponent(correctTitle)}`;
        let relatedData = [];
        try {
            const relRes = await axios.get(relatedUrl, { headers: HEADERS, timeout: 3000 });
            relatedData = relRes.data.pages || [];
        } catch (e) { /* Ignore related fail */ }

        // 4. Build Carousel Elements
        const elements = [];

        // Add Main Card
        elements.push({
            title: mainData.title,
            subtitle: mainData.extract ? mainData.extract.substring(0, 80) + "..." : "Read article...",
            image_url: mainData.originalimage?.source || mainData.thumbnail?.source || "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/1200px-Wikipedia-logo-v2.svg.png",
            buttons: [{ type: "web_url", url: mainData.content_urls.desktop.page, title: "📖 Read" }]
        });

        // Add up to 4 Related Cards
        relatedData.slice(0, 4).forEach(page => {
            elements.push({
                title: page.title,
                subtitle: page.extract ? page.extract.substring(0, 80) + "..." : "Related topic",
                image_url: page.originalimage?.source || page.thumbnail?.source || "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/1200px-Wikipedia-logo-v2.svg.png",
                buttons: [{ type: "web_url", url: page.content_urls.desktop.page, title: "📖 Read" }]
            });
        });

        // Save Cache
        wikiCache.set(cacheKey, { elements, timestamp: Date.now() });

        // Send
        if (api.sendCarousel && elements.length > 0) {
            await api.sendCarousel(elements, senderID);
        } else {
            api.sendMessage(`📚 **${mainData.title}**\n${mainData.extract}`, senderID);
        }

    } catch (e) {
        console.error("Wiki error:", e.message);
        api.sendMessage("❌ Wiki lookup failed.", senderID);
    }
};
