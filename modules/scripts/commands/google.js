const axios = require("axios");

module.exports.config = {
    name: "google",
    aliases: ["search", "find", "g"],
    author: "Sethdico",
    version: "1.1",
    category: "Utility",
    description: "Search the web using Google.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    const query = args.join(" ");
    if (!query) return api.sendMessage("🔍 Usage: google <topic>", event.sender.id);

    // Visual: Typing Indicator
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    // === 🔑 CONFIGURATION ===
    const API_KEY = "AIzaSyCPhWbGx54TYT1TdJzbddMfoepJkJmUXTo"; 
    const CX = "c12feb44f74064334"; // ✅ Extracted from your snippet

    try {
        const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
            params: {
                key: API_KEY,
                cx: CX,
                q: query,
                num: 3 // Fetch top 3 results
            },
            timeout: 10000
        });

        const items = res.data.items;
        if (!items || items.length === 0) {
            return api.sendMessage(`❌ No results found for "${query}".`, event.sender.id);
        }

        // Build the message
        let msg = `🔍 **Google: ${query}**\n━━━━━━━━━━━━━━━━\n`;

        items.forEach((item, index) => {
            const title = item.title;
            const snippet = item.snippet ? item.snippet.replace(/\n/g, " ") : "No description.";
            const link = item.link;

            msg += `${index + 1}. **${title}**\n${snippet}\n🔗 ${link}\n\n`;
        });

        // Add a button to the #1 result
        const buttons = [{
            type: "web_url",
            url: items[0].link,
            title: "🌍 Visit Top Result"
        }];

        await api.sendButton(msg, buttons, event.sender.id);

    } catch (e) {
        console.error("Google Error:", e.response?.data || e.message);
        const errCode = e.response?.status;
        
        if (errCode === 403) return api.sendMessage("❌ API Limit Reached or Invalid Key.", event.sender.id);
        if (errCode === 400) return api.sendMessage("❌ Invalid Request (Check CX ID settings).", event.sender.id);
        
        api.sendMessage("❌ Google is currently unavailable.", event.sender.id);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id).catch(()=>{});
    }
};
