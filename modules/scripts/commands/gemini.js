const axios = require("axios");

module.exports.config = {
    name: "gemini",
    author: "Sethdico",
    version: "1.0",
    category: "AI",
    description: "Google Gemini Vision",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    let prompt = args.join(" ");
    let imageUrl = "";

    // Check attachments (Pagebot specific structure)
    if (event.message && event.message.attachments && event.message.attachments.length > 0) {
        const att = event.message.attachments[0];
        if (att.type === "image" || att.type === "photo") {
            imageUrl = att.payload ? att.payload.url : att.url;
        }
    }
    // Note: Pagebot doesn't easily support "reply" context unless stored in memory
    // So we rely on direct attachments for now.

    if (!prompt && imageUrl) prompt = "Describe this image detailedly.";
    if (!prompt && !imageUrl) return api.sendMessage("⚠️ Please provide a prompt or image.", event.sender.id);

    api.sendTypingIndicator(true, event.sender.id);

    try {
        const apiUrl = "https://norch-project.gleeze.com/api/gemini";
        const requestParams = { prompt: prompt };
        if (imageUrl) requestParams.imageurl = imageUrl;

        const response = await axios.get(apiUrl, { params: requestParams });
        const reply = response.data.message || response.data.response || response.data.result;

        if (reply) {
            const finalMsg = `✨ **Gemini Vision**\n━━━━━━━━━━━━━━━━\n${reply}\n━━━━━━━━━━━━━━━━`;
            api.sendMessage(finalMsg, event.sender.id);
        } else {
            api.sendMessage("❌ Empty response.", event.sender.id);
        }

    } catch (error) {
        api.sendMessage("❌ Gemini is currently sleeping.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
