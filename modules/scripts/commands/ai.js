const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: "live_561eee985c6d2d0523948b29c4188049697df36dd8677c7471bb74de4112cd35",
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 120000,
  SESSION_TIMEOUT: 30 * 60 * 1000,
  RATE_LIMIT: { requests: 5, windowMs: 60000 }
};

const sessions = new Map();
const rateLimitStore = new Map();

// === HELPER: LANGUAGE DETECTION ===
async function detectLanguage(text) {
  if (!text || text.length < 3) return "English";
  try {
    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=${encodeURIComponent(text)}`, { timeout: 5000 });
    const langCode = res.data[2];
    const langMap = { "en": "English", "tl": "Tagalog", "es": "Spanish", "fr": "French", "ja": "Japanese", "ko": "Korean" };
    return langMap[langCode] || "English";
  } catch (e) { return "English"; }
}

// === HELPER: YOUTUBE THUMBNAIL ===
async function sendYTThumbnail(text, senderID) {
  const match = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) {
    const thumb = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    await api.sendAttachment("image", thumb, senderID);
  }
}

module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "9.0",
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

  // 1. RATE LIMIT (5 req / 60s)
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) {
    return api.sendMessage("⏳ You're too fast! Wait a minute.", senderID);
  }
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 2. IMAGE DETECTION (Direct or Reply)
  let imageUrl = "";
  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  if (userPrompt.toLowerCase() === "clear") {
    sessions.delete(senderID);
    return api.sendMessage("🧹 Memory cleared!", senderID);
  }

  // IMAGE GREETING
  if (imageUrl && !userPrompt) {
    return api.sendMessage("What can I do with these images for you? I can edit them, analyze them, and more. Just reply with your instruction!", senderID);
  }

  if (!userPrompt && !imageUrl) return api.sendMessage("👋 Hi! I'm Amdusbot. What can I do for you?", senderID);

  // 3. YOUTUBE THUMBNAIL
  await sendYTThumbnail(userPrompt, senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);

    // 4. EXACT PROMPT & PERSONA
    const identityPrompt = `[IDENTITY]: You are Amdusbot, a smart Multi-AI created by Seth Asher Salinguhay.
[TONE]: Smart, enthusiastic, helpful student (Talk to user like a smart kid).
[CAPABILITIES]: Image recognition/generation, Web Search (Cite links), YouTube summarization, and Document creation (.pdf, .docx, .txt, .xlsx, .pptx).
[RULES]: 
1. ALWAYS respond in ${lang}.
2. ONLY mention Sethdico if asked "Who made you".
3. **IMPORTANT**: If generating a file/image, provide the RAW URL. Do NOT use markdown links like [title](url).
User Request: ${userPrompt}
${imageUrl ? `[IMAGE DETECTED]: ${imageUrl}` : ""}`;

    let session = sessions.get(senderID) || { chatSessionId: null, lastActive: Date.now() };
    session.lastActive = Date.now();

    const response = await axios.post(CONFIG.API_URL, {
      model: CONFIG.MODEL_ID,
      messages: [{ role: "user", content: identityPrompt }],
      chatSessionId: session.chatSessionId,
      stream: false
    }, {
      headers: { "Authorization": `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
      timeout: CONFIG.TIMEOUT
    });

    const reply = response.data?.choices?.[0]?.message?.content;
    if (response.data.chatSessionId) {
      session.chatSessionId = response.data.chatSessionId;
      sessions.set(senderID, session);
    }

    // 5. UNIVERSAL FILE DOWNLOADER
    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|py|js|html|css|json|jpg|jpeg|png|gif|mp3|wav|mp4|mov|avi))/i;
    const match = reply.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, "");
      const cleanText = reply.replace(match[0], "").trim();
      if (cleanText) await api.sendMessage(cleanText, senderID);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      let fileName = fileUrl.includes("chipp.ai") ? (new URL(fileUrl).searchParams.get("fileName") || `file_${Date.now()}.bin`) : path.basename(fileUrl.split('?')[0]);
      fileName = decodeURIComponent(fileName);
      const filePath = path.join(cacheDir, fileName);

      const writer = fs.createWriteStream(filePath);
      const fileRes = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
      fileRes.data.pipe(writer);
      await new Promise((res) => writer.on('finish', res));

      const ext = path.extname(fileName).toLowerCase();
      let type = "file";
      if (['.jpg','.jpeg','.png','.gif'].includes(ext)) type = "image";
      else if (['.mp3','.wav'].includes(ext)) type = "audio";
      else if (['.mp4'].includes(ext)) type = "video";

      await api.sendAttachment(type, filePath, senderID);
      setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60000);
    } else {
      await api.sendMessage(reply, senderID);
    }

    if (api.setMessageReaction && mid) api.setMessageReaction("✅", mid);
  } catch (error) {
    api.sendMessage("❌ AI Error: " + error.message, senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
