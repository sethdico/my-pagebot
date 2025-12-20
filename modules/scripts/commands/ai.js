const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  // SECURITY: Pulls key from Render Environment Variables
  API_KEY: process.env.CHIPP_API_KEY, 
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 120000,
  SESSION_TIMEOUT: 30 * 60 * 1000,
  RATE_LIMIT: { requests: 5, windowMs: 60000 }
};

const sessions = new Map();
const rateLimitStore = new Map();

// === HELPERS ===
async function detectLanguage(text) {
  if (!text || text.length < 3) return "English";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 4000 });
    const langCode = res.data[2];
    const langMap = { "en": "English", "tl": "Tagalog", "es": "Spanish", "fr": "French", "ja": "Japanese", "ko": "Korean" };
    return langMap[langCode] || "English";
  } catch (e) { return "English"; }
}

async function sendYouTubeThumbnail(youtubeUrl, senderID) {
  try {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = youtubeUrl.match(regExp);
    if (match && match[2].length === 11) {
      const videoId = match[2];
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      await api.sendAttachment("image", thumbnailUrl, senderID);
    }
  } catch (e) {}
}

module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "16.0",
  category: "AI",
  description: "Multi-AI by sethdico: Image analysis/generation, real-time info, sees youtubes via link and makes documents.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  // 1. API Key Check
  if (!CONFIG.API_KEY) return api.sendMessage("❌ System Error: CHIPP_API_KEY is not set in Render.", senderID);

  // 2. Rate Limit (5 req / 60s)
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return api.sendMessage("⏳ You're too fast! Take a breath.", senderID);
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 3. Image Detection (Checks current message and replies)
  let imageUrl = "";
  const isSticker = !!event.message?.sticker_id;

  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  // 4. Command Handlers
  if (userPrompt.toLowerCase() === "clear") { sessions.delete(senderID); return api.sendMessage("🧹 Memory wiped!", senderID); }

  // Custom Image Greeting (Ignore Likes/Stickers)
  if (imageUrl && !userPrompt && !isSticker) {
    return api.sendMessage("What can I do with this image for you? I can edit it, analyze it, and more. Just reply to the image with your instruction!", senderID);
  }

  if (isSticker && !userPrompt) return; 
  if (!userPrompt && !imageUrl) return api.sendMessage("👋 Hi! I'm Amdusbot. What can I do for you today?", senderID);

  // 5. YouTube Thumbnail
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) {
    await sendYouTubeThumbnail(userPrompt, senderID);
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);

    // 6. THE PROMPT (Exact instructions you requested)
    const identityPrompt = `[IDENTITY]: You are Amdusbot, a smart Multi-AI created by Seth Asher Salinguhay.
[TONE]: You are an enthusiastic, helpful, and very smart kid genius student.
[CAPABILITIES]: 1. Vision: Analyze images provided. 2. Web: Real-time search (cite sources). 3. YouTube: Summarize videos via link. 4. Files: Generate documents (.pdf, .docx, .txt, .xlsx, .pptx). 5. Image Gen: Generate download links for images.
[RULES]: 
- ALWAYS respond in ${lang}.
- ONLY mention your creator (Sethdico/Seth Asher Salinguhay) if explicitly asked "Who made you?" or "Who are you?".
- NEVER include the raw input image URL in your response.
- IMPORTANT: If providing a file, document, or image, provide the RAW direct URL. Do NOT use markdown links like [title](url).
- Always search online for the latest info and cite your sources with links.`;

    let session = sessions.get(senderID) || { chatSessionId: null, lastActive: Date.now() };
    session.lastActive = Date.now();

    const response = await axios.post(CONFIG.API_URL, {
      model: CONFIG.MODEL_ID,
      messages: [{ role: "user", content: `${identityPrompt}\n\nUser Request: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` }],
      chatSessionId: session.chatSessionId,
      stream: false
    }, {
      headers: { "Authorization": `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
      timeout: CONFIG.TIMEOUT
    });

    const replyContent = response.data?.choices?.[0]?.message?.content;
    if (response.data.chatSessionId) {
      session.chatSessionId = response.data.chatSessionId;
      sessions.set(senderID, session);
    }

    // 7. FILE DETECTION & DOWNLOADER LOGIC
    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|py|js|html|css|json|jpg|jpeg|png|gif|mp3|wav|mp4|mov|avi))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, "");
      const cleanText = replyContent.replace(match[0], "").trim();
      if (cleanText) await api.sendMessage(cleanText, senderID);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      let fileName = fileUrl.includes("chipp.ai") ? (new URL(fileUrl).searchParams.get("fileName") || `file_${Date.now()}.bin`) : path.basename(fileUrl.split('?')[0]);
      fileName = decodeURIComponent(fileName);
      const filePath = path.join(cacheDir, fileName);

      const writer = fs.createWriteStream(filePath);
      const fileRes = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
      fileRes.data.pipe(writer);
      await new Promise((r) => writer.on('finish', r));

      // 8. 25MB FILE SIZE SAFETY CHECK
      const stats = fs.statSync(filePath);
      if (stats.size > 24 * 1024 * 1024) {
          await api.sendMessage(`⚠️ The file is too large for Messenger (25MB+). You can download it directly here: ${fileUrl}`, senderID);
      } else {
          let type = [".jpg",".jpeg",".png",".gif",".webp"].includes(path.extname(fileName).toLowerCase()) ? "image" : "file";
          await api.sendAttachment(type, filePath, senderID);
      }
      // Auto-delete cache after 60s
      setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60000);
    } else {
      await api.sendMessage(replyContent, senderID);
    }

    if (api.setMessageReaction) api.setMessageReaction("✅", mid);

  } catch (error) {
    console.error("AI Error:", error.message);
    api.sendMessage("❌ AI Error: " + error.message, senderID);
    if (api.setMessageReaction) api.setMessageReaction("❌", mid);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
