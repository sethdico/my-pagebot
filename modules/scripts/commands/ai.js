const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// CONFIGURATION
const CONFIG = {
    API_URL: "https://app.chipp.ai/api/v1/chat/completions",
    API_KEY: "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35",
    MODEL_ID: "newapplication-10034686", 
    TIMEOUT: 120000, 
    SESSION_TIMEOUT: 30 * 60 * 1000, 
};

const sessions = new Map();

// Garbage Collection
setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, userId) => {
        if (now - session.lastActive > CONFIG.SESSION_TIMEOUT) sessions.delete(userId);
    });
}, 300000);

module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "8.0",
  category: "AI",
  // The exact description you wanted
  description: "Multi-AI by Sethdico: Image analysis/generation, real-time web search, YouTube summarization, and Document creation.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const senderID = event.sender.id;
    const userPrompt = args.join(" ").trim();
    const mid = event.message?.mid;
    
    // 1. IMAGE DETECTION
    let imageUrl = "";
    if (event.message?.attachments?.[0]?.type === "image") {
        imageUrl = event.message.attachments[0].payload.url;
    } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
        imageUrl = event.message.reply_to.attachments[0].payload.url;
    }

    // 2. COMMANDS
    if (userPrompt.toLowerCase() === "clear") {
        sessions.delete(senderID);
        return api.sendMessage("🧹 Memory wiped! What's next?", senderID);
    }

    if (!userPrompt && !imageUrl) {
        return api.sendMessage("👋 Hi! I'm Amdusbot. I can see images, watch YouTube videos, search the web, or create files for you!", senderID);
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        // 3. PERSONA & INSTRUCTIONS
        const identityPrompt = `[IDENTITY]: You are Amdusbot, a Multi-AI created by Seth Asher Salinguhay.
[TONE]: Smart, enthusiastic, helpful student (Kid-like but professional).
[CAPABILITIES]:
1. **Vision**: Analyze images provided.
2. **Web**: Real-time search (Cite sources).
3. **YouTube**: Summarize videos via link.
4. **Files**: Generate documents, code, spreadsheets.
5. **Images**: Generate direct download links for images.

[RULES]:
1. Only mention your creator (Sethdico) if explicitly asked.
2. **IMPORTANT**: If providing a file or image, give the RAW DIRECT URL. Do NOT use markdown formatting like [title](url).
User Input: ${userPrompt}
${imageUrl ? `[IMAGE DETECTED]: ${imageUrl}` : ""}`;

        let session = sessions.get(senderID) || { chatSessionId: null, lastActive: Date.now() };
        session.lastActive = Date.now();

        const requestData = {
            model: CONFIG.MODEL_ID,
            messages: [{ role: "user", content: identityPrompt }],
            stream: false
        };
        if (session.chatSessionId) requestData.chatSessionId = session.chatSessionId;

        // 4. API CALL
        const response = await axios.post(CONFIG.API_URL, requestData, {
            headers: { "Authorization": `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
            timeout: CONFIG.TIMEOUT
        });

        const replyContent = response.data?.choices?.[0]?.message?.content;
        if (!replyContent) throw new Error("Empty response");

        if (response.data.chatSessionId) {
            session.chatSessionId = response.data.chatSessionId;
            sessions.set(senderID, session);
        }

        // 5. FILE DETECTION (Robust Regex Fix)
        // Catches links but stops at ) or " or space to avoid markdown errors
        const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|py|js|html|css|json|jpg|jpeg|png|gif|mp3|wav|mp4|mov|avi))/i;
        const match = replyContent.match(fileRegex);

        if (match) {
            // Clean URL: Remove trailing dots/commas/parentheses
            let fileUrl = match[0].replace(/[).,]+$/, "");
            
            // Remove the raw link from the text message for cleaner chat
            const cleanText = replyContent.replace(match[0], "").replace(/\[.*?\]\(\)/g, "").trim();

            if (cleanText) await api.sendMessage(cleanText, senderID);

            console.log(`📥 Downloading: ${fileUrl}`);
            
            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

            // --- FILENAME LOGIC ---
            let fileName = `file_${Date.now()}.bin`;
            try {
                if (fileUrl.includes("chipp.ai")) {
                    const urlObj = new URL(fileUrl);
                    const nameParam = urlObj.searchParams.get("fileName");
                    if (nameParam) fileName = nameParam;
                } else {
                    fileName = path.basename(fileUrl.split('?')[0]);
                }
                fileName = decodeURIComponent(fileName);
            } catch (e) { console.error("Name extraction error:", e); }

            const filePath = path.join(cacheDir, fileName);
            const writer = fs.createWriteStream(filePath);

            const fileResponse = await axios({
                url: fileUrl,
                method: 'GET',
                responseType: 'stream'
            });
            fileResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // --- TYPE MAPPING ---
            const ext = path.extname(fileName).toLowerCase();
            let type = "file";
            
            if (['.jpg','.jpeg','.png','.gif','.bmp','.webp'].includes(ext)) type = "image";
            else if (['.mp3','.wav','.ogg','.m4a'].includes(ext)) type = "audio";
            else if (['.mp4','.mov','.avi','.mkv'].includes(ext)) type = "video";

            // Send File
            await api.sendAttachment(type, filePath, senderID);

            // Cleanup
            setTimeout(() => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }, 60000);

        } else {
            // Normal Text Message
            await api.sendMessage(replyContent, senderID);
        }

        try { if (api.setMessageReaction && mid) api.setMessageReaction("✅", mid); } catch(e) {}

    } catch (error) {
        console.error("AI Error:", error.message);
        api.sendMessage("❌ Error: " + error.message, senderID);
        try { if (api.setMessageReaction && mid) api.setMessageReaction("❌", mid); } catch(e) {}
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
