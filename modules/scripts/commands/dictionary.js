const { http } = require("../../utils");

module.exports.config = {
    name: "dict",
    author: "Sethdico",
    version: "7.1-Fast",
    category: "Utility",
    description: "Dictionary + Slang support.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 3,
};

module.exports.run = async function ({ event, args, api }) {
    let input = args.join(" ").trim();
    const isSlang = args[0]?.toLowerCase() === "slang";
    if (isSlang) input = args.slice(1).join(" ").trim();

    if (!input) return api.sendMessage("📖 Usage: dict <word>", event.sender.id);

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(() => {});

    // If explicit slang request, go straight to Urban
    if (isSlang) return searchUrban(input, event, api);

    try {
        const apiKey = process.env.DICT_API_KEY;
        const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(input)}?key=${apiKey}`;
        
        const response = await http.get(url);
        const data = response.data;

        // If no formal definition, try slang
        if (!data?.length || typeof data[0] === "string") {
            return searchUrban(input, event, api, true); 
        }

        const entry = data[0];
        
        // Handle Audio
        const audioName = entry.hwi?.prs?.[0]?.sound?.audio;
        let audioUrl = null;
        if (audioName) {
            let subdir = audioName.startsWith("bix") ? "bix" : audioName.charAt(0);
            if (/^[0-9_]/.test(audioName)) subdir = "number";
            audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audioName}.mp3`;
        }

        const defs = entry.shortdef ? entry.shortdef.map((d, i) => `${i+1}. ${d}`).join("\n") : "No definition.";
        const msg = `📖 **${entry.hwi.hw.toUpperCase()}** (${entry.fl})\n\n${defs}`;
        
        await api.sendMessage(msg, event.sender.id);
        if (audioUrl) api.sendAttachment("audio", audioUrl, event.sender.id).catch(()=>{});

    } catch (error) {
        searchUrban(input, event, api, true);
    }
};

async function searchUrban(query, event, api, isFallback = false) {
    try {
        const res = await http.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
        if (!res.data.list?.length) return api.sendMessage(`❌ No definition found for "${query}".`, event.sender.id);

        const entry = res.data.list[0];
        const msg = `${isFallback ? "📖" : "🛹"} **${entry.word.toUpperCase()}**\n\n📝 ${entry.definition.replace(/[\[\]]/g, "")}`;
        api.sendMessage(msg, event.sender.id);
    } catch (e) {
        api.sendMessage("❌ Dictionary offline.", event.sender.id);
    }
}
