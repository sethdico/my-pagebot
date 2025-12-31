const { http } = require('../../utils/http');

const API_KEY = process.env.CHIPP_API_KEY;

async function askChipp(userPrompt, imageUrl, sessionData) {
    const identityPrompt = `[SYSTEM]: You are Amdusbot, a helpful and wise AI assistant created by Seth Asher Salinguhay. Use chain-of-thought reasoning but only send the final answer. Response limit: 2000 characters.`;
    
    let userMessage = "";
    if (imageUrl) userMessage += `[Image URL: ${imageUrl}]\n\n`;
    userMessage += userPrompt || "Describe this image in detail.";

    try {
        const response = await http.post("https://app.chipp.ai/api/v1/chat/completions", {
            model: "newapplication-10035084",
            messages: [
                { role: "system", content: identityPrompt },
                { role: "user", content: userMessage }
            ],
            chatSessionId: sessionData?.chatSessionId,
            stream: false
        }, { 
            headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
            timeout: 60000
        });

        return response.data;
    } catch (e) {
        return { error: true };
    }
}

module.exports = { askChipp };
