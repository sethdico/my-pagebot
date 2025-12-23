const axios = require("axios");

module.exports.config = {
    name: "deepimg",
    aliases: ["draw"],
    author: "Sethdico",
    version: "1.2",
    category: "Fun",
    description: "Generate Anime Image",
    adminOnly: false,
    usePrefix: false,
    cooldown: 15,
};

module.exports.run = async function ({ event, args, api }) {
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("🎨 Usage: deepimg <description>", event.sender.id);

    api.sendMessage("🎨 Generating...", event.sender.id);
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id).catch(()=>{});

    try {
        // Updated API endpoint that is generally more stable for anime style
        const url = `https://shin-apis.onrender.com/ai/deepimg?prompt=${encodeURIComponent(prompt)}&style=anime`;
        const res = await axios.get(url, { timeout: 20000 }); // 20s timeout for image gen
        
        const imgUrl = res.data.url || res.data.image;

        if (imgUrl) {
            await api.sendAttachment("image", imgUrl, event.sender.id);
        } else {
            throw new Error("No image returned");
        }
    } catch (e) {
        api.sendMessage("❌ Generation failed. Try a simpler prompt.", event.sender.id);
    }
};
