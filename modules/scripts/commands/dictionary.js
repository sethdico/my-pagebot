const { http } = require("../../utils");

module.exports.config = {
    name: "dict",
    author: "Sethdico",
    version: "8.0",
    category: "Utility",
    description: "Dictionary with Urban fallback and flow.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 3,
};

module.exports.run = async function ({ event, args, api, reply }) {
    let input = args.join(" ").trim();
    const id = event.sender.id;

    if (!input) return reply("📖 Usage: dict <word>");

    try {
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(input)}`;
        const res = await http.get(url);
        const data = res.data[0];

        const definition = data.meanings[0].definitions[0].definition;
        const example = data.meanings[0].definitions[0].example ? `\n\n*Ex: ${data.meanings[0].definitions[0].example}*` : "";
        
        const msg = `📖 **${data.word.toUpperCase()}** (${data.meanings[0].partOfSpeech})\n━━━━━━━━━━━━━━━━\n${definition}${example}`;
        
        await api.sendMessage(msg, id);
        
        // Flow: Suggest Urban Dictionary or another search
        return api.sendQuickReply("💡 Want more?", ["Urban Slang", "Dict Help"], id);

    } catch (e) {
        // Fallback to Urban
        return searchUrban(input, event, api);
    }
};

async function searchUrban(query, event, api) {
    try {
        const res = await http.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
        if (!res.data.list?.length) return api.sendMessage(`❌ No definition found for "${query}".`, event.sender.id);

        const entry = res.data.list[0];
        const msg = `🛹 **URBAN: ${entry.word.toUpperCase()}**\n━━━━━━━━━━━━━━━━\n${entry.definition.replace(/[\[\]]/g, "")}`;
        
        await api.sendMessage(msg, event.sender.id);
        return api.sendQuickReply("💡 Options:", ["Dict", "Help"], event.sender.id);
    } catch (e) {
        api.sendMessage("❌ Dictionary offline.", event.sender.id);
    }
}
