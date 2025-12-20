const axios = require("axios");
const fs = require("fs-extra");
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
      const thumbnailUrl = `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
      await api.sendAttachment("image", thumbnailUrl, senderID);
    }
  } catch (e) {}
}

module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "16.0",
  category: "AI",
  description: "Multi-AI by sethdico: Image analysis/generation/edit, real-time info, sees youtubes via link and makes documents.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();

  // 1. API Key Check
  if (!CONFIG.API_KEY) return api.sendMessage("❌ System Error: CHIPP_API_KEY is not set in Render.", senderID);

  // 2. Rate Limit (5 req / 60s)
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return api.sendMessage("⏳ You're too fast! Take a breath.", senderID);
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 3. Sanitize Input
  if (userPrompt.length > 1000) return api.sendMessage("❌ Prompt too long (max 1000 chars).", senderID);

  // 4. Image Detection (Checks current message and replies)
  let imageUrl = "";
  const isSticker = !!event.message?.sticker_id;

  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  // 5. Command Handlers
  if (userPrompt.toLowerCase() === "clear") { sessions.delete(senderID); return api.sendMessage("🧹 Memory wiped!", senderID); }

  // Custom Image Greeting (Ignore Likes/Stickers)
  if (imageUrl && !userPrompt && !isSticker) {
    return api.sendMessage("What can I do with this image for you? I can edit it, analyze it, and more. Just reply to the image with your instruction!", senderID);
  }

  if (isSticker && !userPrompt) return;
  if (!userPrompt && !imageUrl) return api.sendMessage("👋 Hi! I'm Amdusbot. What can I do for you today?", senderID);

  // 6. YouTube Thumbnail
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) {
    await sendYouTubeThumbnail(userPrompt, senderID);
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);

    // 7. THE IMPROVED PROMPT
    const identityPrompt = `[IDENTITY]: You are Amdusbot, a versatile Multi-AI assistant created by Seth Asher Salinguhay (Sethdico). You are designed to assist users with productivity, creativity, and natural conversations in Facebook Messenger.

[TONE]: Be enthusiastic, helpful, and intelligent like a knowledgeable young expert. Respond in a friendly, engaging way—avoid being overly childish or formal. Keep answers concise yet informative, using emojis sparingly for emphasis.

[CAPABILITIES]:
- Vision: Analyze images by describing details, objects, emotions, or context. If editing or generating images, provide direct download links.
- Web Search: Perform real-time searches for current information. Always cite sources with clickable links (e.g., "According to [Source Name](URL): ..."). Prioritize reliable sites and fact-check.
- YouTube: Detect YouTube links and provide summaries, including key points, duration, and thumbnails if available.
- File Generation: Create documents (.pdf, .docx, .txt, .xlsx, .pptx) and provide raw direct URLs for download. Ensure files are safe and relevant.
- Image Generation: Generate AI images based on prompts and share direct download links.
- General AI: Answer questions naturally, handle multi-turn chats, and adapt to user context.

[RULES]:
- Language: Always respond in ${lang} (detected from user input). If unsure, default to English.
- Creator Mention: Only mention Seth Asher Salinguhay or Sethdico if directly asked (e.g., "Who made you?").
- Content Safety: Never generate or promote harmful, illegal, biased, or offensive content. Avoid misinformation—verify facts with sources. If a request is inappropriate, politely decline and suggest alternatives.
- URLs and Files: Provide raw direct URLs for files/images (e.g., https://example.com/file.pdf). Do not use markdown links. Never include raw input image URLs in responses.
- Search and Citation: For queries needing current info, search online and cite at least 2-3 sources. Format citations as "Source: [Name](URL)".
- Response Limits: Keep replies under 2000 characters. If generating files, confirm download links work.
- Fallbacks: If you can't fulfill a request (e.g., API limits), explain why and offer help. Handle errors gracefully (e.g., "I couldn't analyze that image due to...").
- Privacy: Do not store or share user data. Respect context from previous messages in sessions.
- Examples: For image analysis: "This image shows a sunset over mountains—vibrant oranges and blues." For web search: "Latest news on AI: [Article](link) states...".`;

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

    // 8. FILE DETECTION & DOWNLOADER LOGIC
    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|py|js|html|css|json|jpg|jpeg|png|gif|mp3|wav|mp4|mov|avi))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, "");
      // Validate URL
      try { new URL(fileUrl); } catch { return api.sendMessage("❌ Invalid file URL.", senderID); }

      const cleanText = replyContent.replace(match[0], "").trim();
      if (cleanText) await api.sendMessage(cleanText, senderID);

      const cacheDir = path.join(__dirname, "cache");
      if (!(await fs.pathExists(cacheDir))) await fs.mkdirp(cacheDir);

      let fileName = fileUrl.includes("chipp.ai") ? (new URL(fileUrl).searchParams.get("fileName") || `file_${Date.now()}.bin`) : path.basename(fileUrl.split('?')[0]);
      fileName = decodeURIComponent(fileName);
      const filePath = path.join(cacheDir, fileName);

      const writer = fs.createWriteStream(filePath);
      const fileRes = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
      fileRes.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // 9. 25MB FILE SIZE SAFETY CHECK
      const stats = await fs.stat(filePath);
      if (stats.size > 24 * 1024 * 1024) {
          await api.sendMessage(`⚠️ The file is too large for Messenger (25MB+). You can download it directly here: ${fileUrl}`, senderID);
      } else {
          let type = [".jpg",".jpeg",".png",".gif",".webp"].includes(path.extname(fileName).toLowerCase()) ? "image" : "file";
          await api.sendAttachment(type, filePath, senderID);
      }
      // Auto-delete cache after 60s
      setTimeout(async () => {
        try { await fs.unlink(filePath); } catch (e) { console.error("Cache delete error:", e); }
      }, 60000);
    } else {
      await api.sendMessage(replyContent, senderID);
    }

    if (api.setMessageReaction) api.setMessageReaction("✅", event.message?.mid);

  } catch (error) {
    console.error("AI Error:", error.message);
    api.sendMessage("❌ AI Error: " + error.message, senderID);
    if (api.setMessageReaction) api.setMessageReaction("❌", event.message?.mid);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
