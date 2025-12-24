const axios = require("axios");

module.exports.config = {
    name: "lens",
    aliases: ["scan", "scope"],
    author: "Sethdico",
    version: "2.0-Agent",
    category: "AI",
    description: "Visual Research Agent (Gemini + DuckDuckGo).",
    adminOnly: false,
    usePrefix: false, // Works without slash
    cooldown: 8,
};

module.exports.run = async function ({ event, args, api }) {
    const senderID = event.sender.id;
    const prompt = args.join(" ").trim();
    let imageUrl = "";

    // 1. DETECT IMAGE (Prioritize Reply -> Then Attachment)
    if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
        imageUrl = event.message.reply_to.attachments[0].payload.url;
    } else if (event.message?.attachments?.[0]?.type === "image") {
        imageUrl = event.message.attachments[0].payload.url;
    }

    // Input Validation
    if (!imageUrl && !prompt) {
        return api.sendMessage("👁️ Usage: Reply to an image with 'lens <question>'", senderID);
    }

    api.sendMessage("👁️ Scanning & Searching...", senderID);
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(()=>{});

    try {
        let searchQuery = prompt;

        // === PHASE 1: GENERATE SEARCH QUERY ===
        // If there is an image, we ask Gemini to describe it for the search engine
        if (imageUrl) {
            const visionPrompt = prompt 
                ? `I need to search the web to answer this user. Based on the image and their question: "${prompt}", give me the best KEYWORD search query. Output ONLY the query, no extra text.`
                : `Identify this image and give me a specific search query to find more info about it. Output ONLY the query.`;

            try {
                const visionRes = await axios.get("https://norch-project.gleeze.com/api/gemini", {
                    params: { prompt: visionPrompt, imageurl: imageUrl }
                });
                // Clean the output
                searchQuery = visionRes.data.response || visionRes.data.content;
                searchQuery = searchQuery.replace(/["\n]/g, "").trim(); 
            } catch (e) {
                searchQuery = prompt || "analyze image"; // Fallback
            }
        }

        // === PHASE 2: SEARCH THE WEB (DuckDuckGo HTML) ===
        let webContext = "";
        try {
            const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
            const ddgRes = await axios.get(ddgUrl, {
                headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }
            });

            // Lightweight Scraper (Regex) to avoid heavy libraries
            const html = ddgRes.data;
            const regex = /class="result__a"[^>]*>([^<]+)<\/a>.*?class="result__snippet"[^>]*>([^<]+)<\/a>/g;
            let match;
            let count = 0;

            while ((match = regex.exec(html)) !== null && count < 3) {
                webContext += `[Source ${count+1}]: ${match[1]} - ${match[2]}\n`;
                count++;
            }
        } catch (e) {
            webContext = "No web results found. Relying on internal knowledge.";
        }

        // === PHASE 3: FINAL ANSWER ===
        const finalPrompt = `
[WEB SEARCH RESULTS for "${searchQuery}"]:
${webContext}

[USER QUESTION]:
${prompt}

[INSTRUCTION]:
You are an intelligent research assistant. 
1. If the user sent an image, combine what you see in the image with the web results to answer.
2. Provide a concise, helpful answer.
3. Ignore web results if they are irrelevant.
        `.trim();

        const finalRes = await axios.get("https://norch-project.gleeze.com/api/gemini", {
            params: { 
                prompt: finalPrompt, 
                imageurl: imageUrl || "" 
            }
        });

        const finalAnswer = finalRes.data.response || finalRes.data.content;

        api.sendMessage(`👁️ **Lens Analysis**\n━━━━━━━━━━━━━━━━\n${finalAnswer}\n\n🔍 Query: "${searchQuery}"`, senderID);

    } catch (e) {
        console.error("Lens Error:", e.message);
        api.sendMessage("❌ Lens malfunction. Please try again.", senderID);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(()=>{});
    }
};
