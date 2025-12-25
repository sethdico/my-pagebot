const axios = require("axios");

module.exports.config = {
    name: "google",
    aliases: ["search", "find", "g"],
    author: "Sethdico",
    version: "2.0-Carousel",
    category: "Utility",
    description: "Search Google and view website screenshots in a carousel.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("🔍 Usage: google <topic>", event.sender.id);

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    // ✅ FIXED: Pulled from Environment
    const API_KEY = process.env.GOOGLE_API_KEY; 
    const CX = process.env.GOOGLE_CX; 

    try {
        const targetUrl = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query)}`;
        const res = await axios.get(targetUrl);
        const items = res.data.items;

        if (!items || items.length === 0) {
            return api.sendMessage(`❌ No results found for "${query}".`, event.sender.id);
        }

        const elements = items.slice(0, 5).map(item => {
            const cleanTitle = item.title.length > 80 ? item.title.substring(0, 77) + "..." : item.title;
            const cleanSnippet = (item.snippet || "No description available").replace(/\n/g, " ");
            const shortSnippet = cleanSnippet.length > 80 ? cleanSnippet.substring(0, 77) + "..." : cleanSnippet;
            const screenshotUrl = `https://image.thum.io/get/width/500/crop/400/noanimate/${item.link}`;

            return {
                title: cleanTitle,
                subtitle: shortSnippet,
                image_url: screenshotUrl,
                buttons: [
                    {
                        type: "web_url",
                        url: item.link,
                        title: "🌍 Visit Site"
                    }
                ]
            };
        });

        await api.sendCarousel(elements, event.sender.id);

    } catch (e) {
        console.error("GOOGLE ERROR:", e.response?.data || e.message);
        api.sendMessage("❌ Google Search failed.", event.sender.id);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id).catch(()=>{});
    }
};
