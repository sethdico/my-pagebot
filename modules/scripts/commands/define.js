const axios = require("axios");

module.exports.config = {
    name: "define",
    author: "Sethdico",
    version: "5.0-ULTIMATE",
    category: "Utility",
    description: "Full Dictionary: Def, Audio, Etymology, Time Travel & Synonyms.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    let input = args.join(" ").trim();
    
    // 0. Handle "Random" feature
    if (input.toLowerCase() === "random") {
        const randomWords = [
            "serendipity", "ephemeral", "petrichor", "vellichor", "sonder", 
            "effervescent", "ineffable", "nefarious", "ethereal", "epiphany",
            "mellifluous", "limerence", "sonorous", "eloquence", "solitude"
        ];
        input = randomWords[Math.floor(Math.random() * randomWords.length)];
    }

    if (!input) return api.sendMessage("📖 **Usage:** define <word>\nExample: define serendipity\nOr try: define random", event.sender.id);

    // 1. Clean Input & Setup
    const word = input.replace(/[^a-zA-Z\s-]/g, "").toLowerCase();
    const apiKey = "0a415fd9-1ec3-4145-9f53-d534da653b1f"; // Your Collegiate Key
    
    api.sendTypingIndicator(true, event.sender.id);

    try {
        // 2. Fetch Data
        const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${apiKey}`;
        const response = await axios.get(url);
        const data = response.data;

        // 3. Handle "Not Found" or "Did You Mean?"
        if (!data || data.length === 0) {
            return api.sendMessage(`❌ No definition found for "${word}".`, event.sender.id);
        }
        if (typeof data[0] === "string") {
            const suggestions = data.slice(0, 5).join(", ");
            return api.sendMessage(`❌ Word not found.\n🤔 **Did you mean:** ${suggestions}?`, event.sender.id);
        }

        // 4. Data Extraction Engine
        const entry = data[0]; // Primary entry
        
        // A. Headword & Syllables
        const headword = entry.hwi?.hw?.replace(/\*/g, "•") || word;
        
        // B. Phonetics
        const pronunciation = entry.hwi?.prs?.[0]?.mw || "---";
        
        // C. Functional Label (Part of Speech)
        const type = entry.fl || "unknown";

        // D. Definitions (Loop through top 3)
        let defText = "";
        if (entry.shortdef && entry.shortdef.length > 0) {
            entry.shortdef.slice(0, 3).forEach((def, i) => {
                defText += `${i + 1}. ${def}\n`;
            });
        } else {
            defText = "No short definition available.";
        }

        // E. Etymology (The "Enigma"/Origin)
        // API returns text with tags like {it}Latin{/it}. We strip them using Regex.
        let etymology = entry.et?.[0]?.[1] || "Origin details unavailable.";
        etymology = etymology.replace(/{[^{}]+}/g, ""); 

        // F. Time Travel (First Known Use)
        let timeTravel = entry.date || "Date unknown";
        timeTravel = timeTravel.replace(/{[^{}]+}/g, "");

        // G. Synonyms & Antonyms (Deep extraction from metadata)
        let synonyms = "None found";
        let antonyms = "None found";

        if (entry.meta) {
            if (entry.meta.syns && entry.meta.syns.length > 0) {
                // Flatten the array and take top 8
                synonyms = entry.meta.syns.flat().slice(0, 8).join(", ");
            }
            if (entry.meta.ants && entry.meta.ants.length > 0) {
                antonyms = entry.meta.ants.flat().slice(0, 8).join(", ");
            }
        }

        // 5. Construct the Ultimate Message
        const msg = `📖 **${headword.toUpperCase()}**
━━━━━━━━━━━━━━━━
🗣️ **Pronunciation:** /${pronunciation}/
🏷️ **Type:** ${type}

📝 **Definitions:**
${defText}
━━━━━━━━━━━━━━━━
📜 **Etymology:**
${etymology}

⏳ **Time Travel:**
First recorded use: ${timeTravel}

🔄 **Synonyms:** ${synonyms}
↔️ **Antonyms:** ${antonyms}
━━━━━━━━━━━━━━━━`;

        // 6. Send Text
        await api.sendMessage(msg, event.sender.id);

        // 7. Audio Engine (Merriam-Webster File Logic)
        if (entry.hwi?.prs?.[0]?.sound?.audio) {
            const audioName = entry.hwi.prs[0].sound.audio;
            let subdir = "";
            
            // Logic to find exact subdirectory per M-W documentation
            if (audioName.startsWith("bix")) subdir = "bix";
            else if (audioName.startsWith("gg")) subdir = "gg";
            else if (!isNaN(audioName.charAt(0)) || audioName.startsWith("_")) subdir = "number";
            else subdir = audioName.charAt(0);

            const audioUrl = `https://media.merriam-webster.com/audio/prons/collegiate/v2/mp3/${subdir}/${audioName}.mp3`;

            // Send Audio Attachment
            await api.sendAttachment("audio", audioUrl, event.sender.id);
        }

    } catch (error) {
        console.error("Define Ultimate Error:", error.message);
        api.sendMessage("❌ The dictionary is currently overwhelming me. Try again later.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
