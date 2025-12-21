const axios = require("axios");

module.exports.config = {
    name: "define",
    author: "Sethdico",
    version: "6.0-HYBRID", 
    category: "Utility",
    description: "Merriam-Webster + Urban Dictionary (Slang) Integration.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    let input = args.join(" ").trim();
    let forceSlang = false;

    // 0. Handle "Random"
    if (input.toLowerCase() === "random") {
        const randomWords = [
            "serendipity", "petrichor", "sonder", "defenestration", "limerence", 
            "yolo", "yeet", "rizz", "effervescent", "vellichor", "sigma", "fanum tax"
        ];
        input = randomWords[Math.floor(Math.random() * randomWords.length)];
    }

    // 1. Check for "slang" keyword triggers
    if (args[0]?.toLowerCase() === "slang" || args[0]?.toLowerCase() === "urban") {
        forceSlang = true;
        input = args.slice(1).join(" ").trim();
    }

    if (!input) return api.sendMessage("📖 **Usage:**\n• define <word> (Standard)\n• define slang <word> (Street)\n• define random", event.sender.id);

    api.sendTypingIndicator(true, event.sender.id);

    // If user specifically asked for slang, skip Merriam-Webster
    if (forceSlang) {
        return searchUrbanDictionary(input, event);
    }

    // 2. Try Merriam-Webster (Standard)
    try {
        const word = input.replace(/[^a-zA-Z\s-]/g, "").toLowerCase();
        const apiKey = "0a415fd9-1ec3-4145-9f53-d534da653b1f"; // Your Collegiate Key
        const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${apiKey}`;
        
        const response = await axios.get(url);
        const data = response.data;

        // If M-W fails or gives suggestions, FALLBACK to Urban Dictionary automatically
        if (!data || data.length === 0 || typeof data[0] === "string") {
            return searchUrbanDictionary(input, event, true); // true = automatic fallback mode
        }

        // --- MERRIAM-WEBSTER PARSER ---
        const entry = data[0];
        const headword = entry.hwi?.hw?.replace(/\*/g, "•") || word;
        const pronunciation = entry.hwi?.prs?.[0]?.mw || "---";
        const type = entry.fl || "unknown";

        let defText = "";
        if (entry.shortdef && entry.shortdef.length > 0) {
            entry.shortdef.slice(0, 3).forEach((def, i) => defText += `${i + 1}. ${def}\n`);
        } else {
            defText = "No short definition available.";
        }

        // Clean Tags like {it}, {bc}, {wi}
        let etymology = entry.et?.[0]?.[1]?.replace(/{[^{}]+}/g, "") || "Origin details unavailable.";
        let timeTravel = entry.date?.replace(/{[^{}]+}/g, "") || "Date unknown";

        // Extract Metadata (Synonyms/Antonyms)
        let synonyms = "None found";
        let antonyms = "None found";

        if (entry.meta) {
            if (entry.meta.syns && entry.meta.syns.length > 0) {
                synonyms = entry.meta.syns.flat().slice(0, 8).join(", ");
            }
            if (entry.meta.ants && entry.meta.ants.length > 0) {
                antonyms = entry.meta.ants.flat().slice(0, 8).join(", ");
            }
        }

        const msg = `📖 **${headword.toUpperCase()}**
━━━━━━━━━━━━━━━━
🗣️ **Pronunciation:** /${pronunciation}/
🏷️ **Type:** ${type}

📝 **Definitions:**
${defText}
━━━━━━━━━━━━━━━━
📜 **Etymology:** ${etymology}
⏳ **Time Travel:** ${timeTravel}

🔄 **Synonyms:** ${synonyms}
↔️ **Antonyms:** ${antonyms}
━━━━━━━━━━━━━━━━`;

        await api.sendMessage(msg, event.sender.id);

        // Audio Handler
        if (entry.hwi?.prs?.[0]?.sound?.audio) {
            const audioName = entry.hwi.prs[0].sound.audio;
            let subdir = "";
            
            // Logic to find exact subdirectory per M-W documentation
            if (audioName.startsWith("bix")) subdir = "bix";
            else if (audioName.startsWith("gg")) subdir = "gg";
            else if (!isNaN(audioName.charAt(0)) || audioName.startsWith("_")) subdir = "number";
            else subdir = audioName.charAt(0);

            const audioUrl = `https://media.merriam-webster.com/audio/prons/collegiate/v2/mp3/${subdir}/${audioName}.mp3`;
            await api.sendAttachment("audio", audioUrl, event.sender.id);
        }

    } catch (error) {
        // If M-W crashes completely (API Error), try Urban as last resort
        searchUrbanDictionary(input, event, true);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};

// --- URBAN DICTIONARY HELPER FUNCTION ---
async function searchUrbanDictionary(query, event, isFallback = false) {
    try {
        const res = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
        const list = res.data.list;

        if (!list || list.length === 0) {
            return api.sendMessage(`❌ Word not found in Standard or Slang dictionaries: "${query}"`, event.sender.id);
        }

        // Get most voted definition
        const entry = list[0];
        
        // Clean brackets [word] -> word
        const cleanDefinition = entry.definition.replace(/\[|\]/g, "");
        const cleanExample = entry.example.replace(/\[|\]/g, "");
        const date = new Date(entry.written_on).toLocaleDateString();

        const title = isFallback ? `📖 **${entry.word.toUpperCase()}** (Slang/Urban)` : `🛹 **${entry.word.toUpperCase()}** (Slang)`;
        const note = isFallback ? "\n*(Standard dictionary didn't have this, so I checked Urban Dictionary)*" : "";

        const msg = `${title}
━━━━━━━━━━━━━━━━
📝 **Definition:**
${cleanDefinition}

💡 **Example:**
"${cleanExample}"
━━━━━━━━━━━━━━━━
👍 **Likes:** ${entry.thumbs_up} | 👎 **Dislikes:** ${entry.thumbs_down}
📅 **Added:** ${date}
✍️ **Author:** ${entry.author}${note}`;

        await api.sendMessage(msg, event.sender.id);

    } catch (e) {
        api.sendMessage("❌ Error connecting to Dictionary databases.", event.sender.id);
    }
}
