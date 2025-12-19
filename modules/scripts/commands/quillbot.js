const axios = require("axios");

module.exports.config = {
    name: "quillbot",
    author: "Sethdico",
    version: "2.0",
    category: "AI",
    description: "Quillbot AI",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const prompt = args.join(" ");
    if (!prompt) return api.sendMessage("⚠️ Please provide text.", event.sender.id);

    api.sendTypingIndicator(true, event.sender.id);

    try {
        const apiUrl = "https://api.ccprojectsapis-jonell.gleeze.com/api/ai/quillbotai";
        const response = await axios.get(apiUrl, { params: { prompt: prompt } });

        const rawStream = response.data.response;
        let finalReply = "";

        // 1. STREAM DECODER LOGIC (From Fbot)
        if (rawStream && rawStream.includes("event: output_done")) {
            try {
                const splitStream = rawStream.split("event: output_done");
                const dataPart = splitStream[1].split("data: ")[1];
                const jsonString = dataPart.split("event: status")[0].trim();
                const parsedData = JSON.parse(jsonString);
                finalReply = parsedData.text;
            } catch (parseError) {
                console.error("Stream Parsing Error");
            }
        } else {
            finalReply = response.data.result || response.data.message;
        }

        if (finalReply) {
            const finalMsg = `✍️ **Quillbot**\n━━━━━━━━━━━━━━━━\n${finalReply}\n━━━━━━━━━━━━━━━━`;
            api.sendMessage(finalMsg, event.sender.id);
        } else {
            api.sendMessage("❌ Failed to decode response.", event.sender.id);
        }

    } catch (error) {
        api.sendMessage("❌ Error contacting Quillbot.", event.sender.id);
    } finally {
        api.sendTypingIndicator(false, event.sender.id);
    }
};
