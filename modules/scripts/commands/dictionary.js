const axios = require("axios");
const BACKUP_WORDS = ["serendipity", "petrichor", "sonder", "defenestration", "limerence"];

module.exports.config = {
    name: "dict",
    author: "Sethdico (Optimized)",
    version: "7.1-Stable",
    category: "Utility",
    description: "Merriam-Webster + Urban Dict.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 3,
};

module.exports.run = async function ({ event, args, api }) {
    let input = args.join(" ").trim();
    const isSlang = args[0]?.toLowerCase() === "slang";
    if (isSlang) input = args.slice(1).join(" ").trim();

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(() => {});

    if (!input || input === "random") {
        try {
            const rnd = await axios.get("https://random-word-api.herokuapp.com/word?number=1", { timeout: 2000 });
            input = rnd.data[0];
        } catch {
            input = BACKUP_WORDS[Math.floor(Math.random() * BACKUP_WORDS.length)];
        }
    }

    if (isSlang) return searchUrban(input, event, api);

    try {
        // ✅ SECURED: Pulled from Render Environment
        const apiKey = process.env.DICT_API_KEY;
        const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(input)}?key=${apiKey}`;
        
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;

        if (!data?.length || typeof data[0] === "string") return searchUrban(input, event, api, true);

        const entry = data[0];
        const audioName = entry.hwi?.prs?.[0]?.sound?.audio;
        let audioUrl = null;

        if (audioName) {
            let subdir = audioName.startsWith("bix") ? "bix" : audioName.startsWith("gg") ? "gg" : /^[0-9_]/.test(audioName) ? "number" : audioName.charAt(0);
            audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audioName}.mp3`;
        }

        const defs = entry.shortdef ? entry.shortdef.map((d, i) => `${i+1}. ${d}`).join("\n") : "No definition.";
        const msg = `📖 **${entry.hwi.hw.replace(/\*/g, "•").toUpperCase()}** (${entry.fl})\n\n${defs}`;
        
        await api.sendMessage(msg, event.sender.id);
        if (audioUrl) api.sendAttachment("audio", audioUrl, event.sender.id).catch(()=>{});
    } catch (error) {
        searchUrban(input, event, api, true);
    }
};

async function searchUrban(query, event, api, isFallback = false) {
    try {
        const res = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`, { timeout: 3000 });
        if (!res.data.list?.length) return api.sendMessage(`❌ No definition found for "${query}".`, event.sender.id);
        const entry = res.data.list[0];
        const msg = `${isFallback ? "📖" : "🛹"} **${entry.word.toUpperCase()}**\n\n📝 ${entry.definition.replace(/[\[\]]/g, "")}\n\n💡 "${entry.example.replace(/[\[\]]/g, "")}"`;
        api.sendMessage(msg, event.sender.id);
    } catch (e) {
        api.sendMessage("❌ Dictionary offline.", event.sender.id);
    }
}
