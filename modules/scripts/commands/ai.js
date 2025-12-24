const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY, 
  MODEL_ID: "newapplication-10035084", 
  TIMEOUT: 120000, 
  RATE_LIMIT: { requests: 5, windowMs: 60000 }
};

const sessions = new Map();
const rateLimitStore = new Map();

// === HELPERS ===
async function sendYouTubeThumbnail(youtubeUrl, senderID, api) {
  try {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = youtubeUrl.match(regExp);
    if (match && match[2].length === 11) {
      const thumbnailUrl = `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
      await api.sendAttachment("image", thumbnailUrl, senderID);
    }
  } catch (e) {}
}

module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "16.7-Fix",
  category: "AI",
  description: "Advanced Multi-AI: Vision, Web Search, and Chat.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  if (!CONFIG.API_KEY) return api.sendMessage("❌ System Error: CHIPP_API_KEY is missing.", senderID);
  
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return api.sendMessage("⏳ Too fast! Please wait a moment.", senderID);
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  let imageUrl = "";
  const isSticker = !!event.message?.sticker_id;
  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  if (userPrompt.toLowerCase() === "clear") { 
      sessions.delete(senderID); 
      return api.sendMessage("🧹 Conversation memory cleared.", senderID); 
  }
  if (isSticker && !userPrompt) return; 
  if (imageUrl && !userPrompt) return api.sendMessage("🖼️ I see the image! What should I do?", senderID);
  if (!userPrompt && !imageUrl) return api.sendMessage("👋 Hi! I'm Amdusbot. I can search the web, see images, and write documents.", senderID);

  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const identityPrompt = `
[SYSTEM]: You are Amdusbot, an advanced AI Assistant by Sethdico.
[MODE]: Helpful, Concise, Intelligent.
[INTERNAL REASONING]: Use Tree of Thoughts and Chain of Verification internally. Output only the final result.
[CAPABILITIES]:
1. VISION: Analyze images via URL.
2. WEB SEARCH: Search real-time info.
3. FILES: Generate .pdf, .docx, .txt, .xlsx. Provide RAW DIRECT URL only.
[INSTRUCTIONS]:
- Response limit: 2000 characters.
- "Who made you?": Answer "Seth Asher Salinguhay (Sethdico)".
`.trim();

    let sessionData = sessions.get(senderID) || { chatSessionId: null };

    const requestBody = {
      model: CONFIG.MODEL_ID,
      messages: [{ 
        role: "user", 
        content: `${identityPrompt}\n\nUser Input: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` 
      }],
      stream: false
    };

    if (sessionData.chatSessionId) {
      requestBody.chatSessionId = sessionData.chatSessionId;
    }

    const response = await axios.post(CONFIG.API_URL, requestBody, {
      headers: { "Authorization": `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
      timeout: CONFIG.TIMEOUT
    });

    if (response.data.chatSessionId) {
      sessions.set(senderID, { chatSessionId: response.data.chatSessionId });
    }

    const replyContent = response.data?.choices?.[0]?.message?.content || "";

    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|jpg|jpeg|png|gif|mp3|wav|mp4))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      // Step 1: Detect file info before doing anything
      let fileName = "file.bin";
      try {
          const urlObj = new URL(fileUrl);
          fileName = urlObj.searchParams.get("fileName") || `amdus_gen_${Date.now()}.pdf`;
          fileName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9._-]/g, "_"); 
      } catch (e) { fileName = `file_${Date.now()}.bin`; }

      const ext = path.extname(fileName).toLowerCase();
      const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);

      // Step 2: Handle Text Message
      const textPart = replyContent.replace(match[0], "").trim();
      if (textPart) await api.sendMessage(textPart, senderID);

      // ✅ ONLY send the Base64 instruction if it's strictly a document/file
      if (!isImage) {
        await api.sendMessage("the file is in Base64 you either decode it using me via pasting", senderID);
      }

      // Step 3: Download and Send
      const filePath = path.join(cacheDir, fileName);
      const fileWriter = fs.createWriteStream(filePath);

      try {
          const fileRes = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
          fileRes.data.pipe(fileWriter);

          await new Promise((resolve, reject) => {
              fileWriter.on('finish', resolve);
              fileWriter.on('error', reject);
          });

          const stats = fs.statSync(filePath);
          if (stats.size > 24 * 1024 * 1024) {
             await api.sendMessage(`📂 File too large. Link: ${fileUrl}`, senderID);
          } else {
             const type = isImage ? "image" : "file";
             await api.sendAttachment(type, filePath, senderID);
          }
      } catch (err) {
          await api.sendMessage(`📂 Connection error. Link: ${fileUrl}`, senderID);
      } finally {
          // Cleanup: Delete after 30 seconds to be safe
          setTimeout(() => { 
            if (fs.existsSync(filePath)) {
              try { fs.unlinkSync(filePath); } catch(e) {}
            }
          }, 30000);
      }
    } else {
      await api.sendMessage(replyContent, senderID);
    }

    if (api.setMessageReaction) api.setMessageReaction("✅", mid);

  } catch (error) {
    console.error("AI Error:", error.message);
    api.sendMessage("❌ AI Glitch. Please try again.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
