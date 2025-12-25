const { http } = require("../../utils");

module.exports.config = {
    name: "wiki",
    author: "Sethdico",
    version: "3.0-ULTRA-Fast",
    category: "Utility",
    description: "Wiki: Search, PDF, On This Day, and Multi-Language.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

const ACCESS_TOKEN = process.env.WIKI_ACCESS_TOKEN;

// we use the fast client headers + auth
const HEADERS = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`
};

module.exports.run = async function ({ event, args, api }) {
    let query = args.join(" ").trim();
    let lang = "en"; 

    if (!query) {
        return api.sendMessage(
            "📚 **Wiki Premium Guide**\n━━━━━━━━━━━━━━━━\n" +
            "🔍 **Search:** `wiki Einstein`\n" +
            "🇵🇭 **Tagalog:** `wiki tl Jose Rizal`\n" +
            "📅 **History:** `wiki today`\n" +
            "📄 **PDF:** `wiki pdf Gravity`\n" +
            "🎲 **Random:** `wiki random`", 
            event.sender.id
        );
    }

    if (query.toLowerCase() === "today") {
        return handleOnThisDay(event, api);
    }

    if (args[0].length === 2 && args[1]) {
        lang = args[0].toLowerCase();
        query = args.slice(1).join(" ");
    }

    if (args[0].toLowerCase() === "pdf") {
        query = args.slice(1).join(" ");
        return handlePDF(query, event, api);
    }

    if (query.toLowerCase() === "random") {
        return handleRandom(event, lang, api);
    }

    api.sendTypingIndicator(true, event.sender.id);
    handleSearch(query, lang, event, api);
};

async function handleSearch(query, lang, event, api) {
    try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
        // fast get
        const response = await http.get(url, { headers: HEADERS });
        const data = response.data;

        if (data.type === "disambiguation") {
            return api.sendMessage(`⚠️ **Ambiguous Topic**\n"${data.title}" could mean multiple things.`, event.sender.id);
        }

        let relatedText = "";
        try {
            const relatedUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/related/${encodeURIComponent(query)}`;
            const relatedRes = await http.get(relatedUrl, { headers: HEADERS });
            const related = relatedRes.data.pages.slice(0, 3).map(p => p.title).join(", ");
            if (related) relatedText = `\n🔗 **Related:** ${related}`;
        } catch (e) {} 

        sendResult(data, relatedText, lang, event, api);

    } catch (error) {
        api.sendMessage(`❌ No results found for "${query}" in ${lang.toUpperCase()}.`, event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
}

async function handleOnThisDay(event, api) {
    api.sendTypingIndicator(true, event.sender.id);
    try {
        const date = new Date();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`;
        
        const res = await http.get(url, { headers: HEADERS });
        const randomEvents = res.data.selected.sort(() => 0.5 - Math.random()).slice(0, 3);
        let msg = `📅 **ON THIS DAY (${mm}/${dd})**\n━━━━━━━━━━━━━━━━\n`;
        randomEvents.forEach(e => {
            msg += `• **${e.year}**: ${e.text}\n\n`;
        });
        const buttons = [{ type: "web_url", url: "https://en.wikipedia.org", title: "📜 Read More" }];
        api.sendButton(msg, buttons, event.sender.id);
    } catch (e) {
        api.sendMessage("❌ Failed to fetch history.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
}

async function handlePDF(query, event, api) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/pdf/${encodeURIComponent(query)}`;
    const buttons = [{ type: "web_url", url: url, title: "📥 Download PDF" }];
    api.sendButton(`📄 **PDF Ready**\nWikipedia PDF for "${query}".`, buttons, event.sender.id);
}

async function handleRandom(event, lang, api) {
    try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`;
        const res = await http.get(url, { headers: HEADERS });
        sendResult(res.data, "", lang, event, api);
    } catch (e) {
        api.sendMessage("❌ Random fetch failed.", event.sender.id);
    }
}

async function sendResult(data, relatedText, lang, event, api) {
    if (data.originalimage?.source) {
        await api.sendAttachment("image", data.originalimage.source, event.sender.id);
    }
    const buttons = [{ type: "web_url", url: data.content_urls.desktop.page, title: "📖 Read Article" }];
    const msg = `📚 **${data.title.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n${data.extract}\n━━━━━━━━━━━━━━━━\n${relatedText}`;
    await api.sendButton(msg, buttons, event.sender.id);
}
