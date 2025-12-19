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
  version: "8.1",
  category: "AI",
  description: "Multi-AI by Sethdico: Image analysis/generation, real-time web search, YouTube summarization, and Document creation.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
    const senderID = event.sender.id;
    const userPrompt = args.join(" ").trim();
    const mid = event.message?.mid;

    // 1. DETERMINE IF CURRENT MESSAGE HAS AN IMAGE
    let imageUrl = "";
    if (event.type === "attachments" && event.message?.attachments?.[0]?.type === "image") {
        // New image sent
        imageUrl = event.message.attachments[0].payload.url;
    } else if (event.type === "message_reply") {
        // Only consider image if replying AND the replied message had an image
        const repliedMsg = event.message.reply_to;
        if (repliedMsg?.attachments?.[0]?.type === "image") {
            imageUrl = repliedMsg.attachments[0].payload.url;
        }
    }

    // 2. HANDLE COMMANDS
    if (userPrompt.toLowerCase() === "clear") {
        sessions.delete(senderID);
        return api.sendMessage("🧹 Memory wiped! What's next?", senderID);
    }

    if (!userPrompt && !imageUrl) {
        return api.sendMessage("👋 Hi! I'm Amdusbot. I can see images, watch YouTube videos, search the web, or create files for you!", senderID);
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        // 3. BUILD PROMPT
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
2. **IMPORTANT**: If providing a file or image, give the RAW DIRECT URL. Do NOT use markdown like [title](url).
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
        if (!replyContent) throw new Error("Empty response from AI");

        if (response.data.chatSessionId) {
            session.chatSessionId = response.data.chatSessionId;
            sessions.set(senderID, session);
        }

        // 5. ROBUST FILE/IMAGE URL DETECTION
        // Only match chipp.ai download links OR non-Facebook file URLs with known extensions
        const fileRegex = /(https:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"<>]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"<>]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|py|js|html|css|json|jpg|jpeg|png|gif|mp3|wav|mp4|mov|avi))/i;
        const match = replyContent.match(fileRegex);

        if (match) {
            let fileUrl = match[0].replace(/[).,]+$/, ""); // Remove trailing punctuation

            // Remove the URL from the reply text to avoid leakage
            const cleanText = replyContent.replace(new RegExp(match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), "").trim();

            if (cleanText) {
                await api.sendMessage(cleanText, senderID);
            }

            console.log(`📥 Downloading AI-generated file: ${fileUrl}`);

            const cacheDir = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

            // --- FILENAME EXTRACTION ---
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
            } catch (e) {
                console.error("Filename extraction error:", e);
            }

            const filePath = path.join(cacheDir, fileName);

            // --- DOWNLOAD FILE ---
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

            // --- DETERMINE TYPE ---
            const ext = path.extname(fileName).toLowerCase();
            let type = "file";
            if (['.jpg','.jpeg','.png','.gif','.bmp','.webp'].includes(ext)) type = "image";
            else if (['.mp3','.wav','.ogg','.m4a'].includes(ext)) type = "audio";
            else if (['.mp4','.mov','.avi','.mkv'].includes(ext)) type = "video";

            // --- SEND ATTACHMENT (MUST BE LOCAL PATH) ---
            await api.sendAttachment(type, filePath, senderID);

            // --- CLEAN UP ---
            setTimeout(() => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }, 60000);
        } else {
            // Normal text response
            await api.sendMessage(replyContent, senderID);
        }

        // Reaction feedback on success
        if (api.setMessageReaction && mid) {
            api.setMessageReaction("✅", mid).catch(() => {});
        }

    } catch (error) {
        console.error("AI Error:", error.message);
        api.sendMessage("❌ AI Error: " + (error.response?.data?.error?.message || error.message || "Unknown error"), senderID);
        if (api.setMessageReaction && mid) {
            api.setMessageReaction("❌", mid).catch(() => {});
        }
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
