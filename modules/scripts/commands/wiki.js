const axios = require("axios");

module.exports.config = {
    name: "wiki",
    author: "Sethdico",
    version: "3.0-ULTRA",
    category: "Utility",
    description: "Wiki: Search, PDF, On This Day, and Multi-Language.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

// Your Wikimedia Access Token
const ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJkOGY5M2FhZjZkYmRiNjBhODE4OTBmMzJhM2UyNTNmOSIsImp0aSI6ImZjZTRiZWI4OTk1ZTFjNTc1ZTVmNTQyMDc5YmE4ZTBmM2Q0OWYyMGU0M2EwNzFjZjhkNTQ5YzJhMDIyNTc4ZWM2NmNjMjFhNzJkNzY1ZDZmIiwiaWF0IjoxNzY2MzMyNDQ0LjQ1NjI1OCwibmJmIjoxNzY2MzMyNDQ0LjQ1NjI2LCJleHAiOjMzMzIzMjQxMjQ0LjQ1NDI1LCJzdWIiOiI4MTMyOTU5MyIsImlzcyI6Imh0dHBzOi8vbWV0YS53aWtpbWVkaWEub3JnIiwicmF0ZWxpbWl0Ijp7InJlcXVlc3RzX3Blcl91bml0Ijo1MDAwLCJ1bml0IjoiSE9VUiJ9LCJzY29wZXMiOlsiYmFzaWMiXX0.WCtJZjuU9uannqn8T-z5xXNpm8s89OCJXoX5aRjf4eJf40zFXUzznHYB1jVOZNe0BD0NvZwxYZ354I1E7Ph8KrPtT7FJcTDjlP1dGP_UVI8mb_IK3pv4pOd8rjTOoJMpsdPg_6zINAVshsX0KuSMwABRb6fUWkapAgfiidHK1tZktYanSIKVKJPcmFoDwo4NC3MI_Fed41A35WoFnEuKHTKYzjMlTKPn5aepoHgYqR-r0UCe4Dnu6Mqd-Z4yZstS-CbQxiGfGayzBFIIRgqHNa47x4AGj2e3Wp6DKJ7Ym78d8pyBpMS-D9lKT0LtLxPaJ2kbQ0t1dn2jcAmwekSWasNR-_cU3Kk4nhCmxtQxBDgH-BzGzNGSAAkEB_7M3SfBQCj-dLeFlO6xi6PdapQH0F-a6AUm8PM_3xLm-XdFqEcsgwKz6kakEvaE6_7w4nqkK8c05MUJEOTSmD3QT0ejl8xCo1U8HtHkALwZxf5r6OBmhkaUuv7eUOHBVdCMolZi9SQhXUoD_8PUPVPJO1CqzxmKTQWB_GFrEyKHp0P5Wl_WIAB7dU999DK1ic_mRz9nM_tcuFY53vAyryTq6vIPVgpK027Mzb7Lk2hABQnPO0YXcxO177bV4CfurP6Ut6fJXjx4zk5dyzFPytrqNApFbK08GFPeyqyGYycjz_qVcBY";

const HEADERS = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'User-Agent': 'Amdusbot/3.0 (WikiCommand)'
};

module.exports.run = async function ({ event, args }) {
    let query = args.join(" ").trim();
    let lang = "en"; // Default English

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

    // --- FEATURE 1: ON THIS DAY ---
    if (query.toLowerCase() === "today") {
        return handleOnThisDay(event);
    }

    // --- FEATURE 2: LANGUAGE SWITCHER ---
    // Check if first arg is a language code (2 letters)
    if (args[0].length === 2 && args[1]) {
        lang = args[0].toLowerCase();
        query = args.slice(1).join(" ");
    }

    // --- FEATURE 3: PDF GENERATOR ---
    if (args[0].toLowerCase() === "pdf") {
        query = args.slice(1).join(" ");
        return handlePDF(query, event);
    }

    // --- FEATURE 4: RANDOM ---
    if (query.toLowerCase() === "random") {
        return handleRandom(event, lang);
    }

    // --- MAIN SEARCH EXECUTION ---
    api.sendTypingIndicator(true, event.sender.id);
    handleSearch(query, lang, event);
};

// ============================================================
// 🧠 CORE FUNCTIONS
// ============================================================

async function handleSearch(query, lang, event) {
    try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
        const response = await axios.get(url, { headers: HEADERS });
        const data = response.data;

        // Disambiguation Check
        if (data.type === "disambiguation") {
            return api.sendMessage(`⚠️ **Ambiguous Topic**\n"${data.title}" could mean multiple things. Please be more specific.`, event.sender.id);
        }

        // Fetch Related Pages (The "See Also" Feature)
        let relatedText = "";
        try {
            const relatedUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/related/${encodeURIComponent(query)}`;
            const relatedRes = await axios.get(relatedUrl, { headers: HEADERS });
            const related = relatedRes.data.pages.slice(0, 3).map(p => p.title).join(", ");
            if (related) relatedText = `\n🔗 **Related:** ${related}`;
        } catch (e) {} // Ignore if related fails

        sendResult(data, relatedText, lang, event);

    } catch (error) {
        if (error.response && error.response.status === 404) {
            // Fallback Search
            try {
                const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;
                const searchRes = await axios.get(searchUrl);
                const suggestions = searchRes.data[1];

                if (suggestions && suggestions.length > 0) {
                    api.sendMessage(`❌ Page not found.\n\n🤔 **Did you mean:**\n• ${suggestions.join("\n• ")}`, event.sender.id);
                } else {
                    api.sendMessage(`❌ No results found for "${query}" in ${lang.toUpperCase()}.`, event.sender.id);
                }
            } catch (e) {
                api.sendMessage("❌ Wiki is currently unavailable.", event.sender.id);
            }
        } else {
            api.sendMessage("❌ An error occurred.", event.sender.id);
        }
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
}

async function handleOnThisDay(event) {
    api.sendTypingIndicator(true, event.sender.id);
    try {
        const date = new Date();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');

        const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`;
        const res = await axios.get(url, { headers: HEADERS });
        
        const events = res.data.selected;
        if (!events || events.length === 0) return api.sendMessage("❌ No historical data found.", event.sender.id);

        // Get 3 Random Events
        const randomEvents = events.sort(() => 0.5 - Math.random()).slice(0, 3);
        
        let msg = `📅 **ON THIS DAY (${mm}/${dd})**\n━━━━━━━━━━━━━━━━\n`;
        randomEvents.forEach(e => {
            msg += `• **${e.year}**: ${e.text}\n\n`;
        });

        const buttons = [{ type: "web_url", url: res.data.content_urls?.desktop?.page || "https://en.wikipedia.org", title: "📜 Read More" }];
        api.sendButton(msg, buttons, event.sender.id);

    } catch (e) {
        api.sendMessage("❌ Failed to fetch history.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
}

async function handlePDF(query, event) {
    // Construct the direct PDF link (Wiki API standard)
    const url = `https://en.wikipedia.org/api/rest_v1/page/pdf/${encodeURIComponent(query)}`;
    
    const buttons = [
        {
            type: "web_url",
            url: url,
            title: "📥 Download PDF"
        }
    ];
    
    api.sendButton(`📄 **PDF Ready**\nClick below to download the official Wikipedia PDF for "${query}".`, buttons, event.sender.id);
}

async function handleRandom(event, lang) {
    try {
        const url = `https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`;
        const res = await axios.get(url, { headers: HEADERS });
        sendResult(res.data, "", lang, event);
    } catch (e) {
        api.sendMessage("❌ Random fetch failed.", event.sender.id);
    }
}

async function sendResult(data, relatedText, lang, event) {
    const title = data.title;
    const summary = data.extract;
    const pageUrl = data.content_urls.desktop.page;
    
    // Image Handling
    if (data.originalimage?.source) {
        await api.sendAttachment("image", data.originalimage.source, event.sender.id);
    } else if (data.thumbnail?.source) {
        await api.sendAttachment("image", data.thumbnail.source, event.sender.id);
    }

    const buttons = [{ type: "web_url", url: pageUrl, title: "📖 Read Article" }];
    
    const flag = lang === 'tl' ? "🇵🇭" : lang === 'es' ? "🇪🇸" : "🇬🇧";

    const msg = `📚 **${title.toUpperCase()}** ${flag}
━━━━━━━━━━━━━━━━
${summary}
━━━━━━━━━━━━━━━━
${relatedText ? relatedText + "\n" : ""}🔗 **Link:** ${data.content_urls.mobile.page}`;

    await api.sendButton(msg, buttons, event.sender.id);
}
