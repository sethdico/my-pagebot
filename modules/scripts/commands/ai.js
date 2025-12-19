const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// CONFIGURATION
const CONFIG = {
    API_URL: "https://app.chipp.ai/api/v1/chat/completions",
    API_KEY: "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35",
    MODEL_ID: "newapplication-10034686", 
    TIMEOUT: 120000, // 2 minutes timeout for large files
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
  version: "6.0",
  category: "AI",
  // Updated Description as requested
  description: "Multi-AI by Sethdico: Image analysis/generation, real-time web search, YouTube summarization, and Document creation.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const senderID = event.sender.id;
    const userPrompt = args.join(" ").trim();
    const mid = event.message?.mid;
    
    // 1. IMAGE INPUT DETECTION
    let imageUrl = "";
    if (event.message?.attachments?.[0]?.type === "image") {
        imageUrl = event.message.attachments[0].payload.url;
    } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
        imageUrl = event.message.reply_to.attachments[0].payload.url;
    }

    // 2. BASIC COMMANDS
    if (userPrompt.toLowerCase() === "clear") {
        sessions.delete(senderID);
        return api.sendMessage("🧹 Memory wiped! Ready for the next task.", senderID);
    }

    if (!userPrompt && !imageUrl) {
        return api.sendMessage("👋 Hi! I'm Amdusbot (Multi-AI). I can see images, watch YouTube links, search the web, and create ANY file for you!", senderID);
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        // 3. PERSONA & INSTRUCTIONS (Updated to include YouTube & Image Gen)
        const identityPrompt = `[IDENTITY]: You are Amdusbot, a Multi-AI created by Seth Asher Salinguhay.
[CAPABILITIES]:
1. **Vision**: Analyze images provided by the user.
2. **Web**: Real-time search (Cite sources).
3. **YouTube**: If a YouTube link is provided, summarize the video content.
4. **Files**: Generate documents, code, spreadsheets, or presentations.
5. **Image Gen**: If asked to "draw" or "generate" an image, create a direct download link for it.

[RULES]:
- Tone: Helpful, Smart, Enthusiastic.
- Only mention "Sethdico" if asked about your creator.
- IF ASKED FOR A FILE/IMAGE: You MUST generate a direct URL ending in a valid extension (.png, .pdf, .docx, etc).
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

        // 4. CALL API
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

        // 5. UNIVERSAL FILE DETECTION (Chipp & Standard Links)
        const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^\s]+|https?:\/\/[^\s]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|py|js|html|css|json|jpg|jpeg|png|gif|mp3|wav|mp4|mov|avi))/i;
        const match = replyContent.match(fileRegex);

        if (match) {
            const fileUrl = match[0];
            const cleanText = replyContent.replace(fileUrl, "").trim();

            if (cleanText) await api.sendMessage(cleanText, senderID);

            console.log(`📥 Downloading: ${fileUrl}`);
            
            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

            // --- SMART FILENAME EXTRACTION ---
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
            // No file found, just send text
            await api.sendMessage(replyContent, senderID);
        }

        try { if (api.setMessageReaction && mid) api.setMessageReaction("✅", mid); } catch(e) {}

    } catch (error) {
        console.error("AI Error:", error.message);
        api.sendMessage("❌ An error occurred.", senderID);
        try { if (api.setMessageReaction && mid) api.setMessageReaction("❌", mid); } catch(e) {}
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
