const axios = require("axios");

module.exports.config = {
    name: "deepimg",
    aliases: ["draw"],
    author: "Sethdico (Ported)",
    version: "1.0",
    category: "Fun",
    description: "Generate Anime Image",
    adminOnly: false,
    usePrefix: false,
    cooldown: 15,
};

module.exports.run = async function ({ event, args }) {
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("🎨 Usage: deepimg <description>", event.sender.id);

    api.sendTypingIndicator(true, event.sender.id);
    api.sendMessage("🎨 Generating image...", event.sender.id);

    try {
        // Fetch the URL
        const url = `https://shin-apis.onrender.com/ai/deepimg?prompt=${encodeURIComponent(prompt)}&style=anime`;
        const res = await axios.get(url);
        const imgUrl = res.data.url || res.data.image;

        if (imgUrl) {
            // Pagebot helper to send image by URL
            await api.sendAttachment("image", imgUrl, event.sender.id);
        } else {
            api.sendMessage("❌ Generation failed.", event.sender.id);
        }
    } catch (e) {
        api.sendMessage("❌ Error generating image.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
