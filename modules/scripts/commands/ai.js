const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === PATHS & STORAGE ===
const CACHE_DIR = path.join(__dirname, "cache");
const SESSION_FILE = path.join(__dirname, "ai_sessions.json");
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY, 
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 120000,
  RATE_LIMIT: { requests: 15, windowMs: 60000 }
};

// --- Persistent Session Management ---
let sessions = {};
try {
  if (fs.existsSync(SESSION_FILE)) {
    sessions = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
  }
} catch (e) { sessions = {}; }

function saveSessions() {
  try { fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2)); } catch (e) {}
}

const rateLimitStore = new Map();

// --- Maintenance Task (Runs every 30 mins) ---
setInterval(() => {
    const now = Date.now();
    // Clean cache files
    fs.readdir(CACHE_DIR, (err, files) => {
        if (err) return;
        files.forEach(file => {
            const filePath = path.join(CACHE_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && now - stats.mtimeMs > 10 * 60 * 1000) fs.unlink(filePath, () => {});
            });
        });
    });
    // Expire old sessions (48 hours)
    for (const id in sessions) {
        if (now - sessions[id].lastActivity > 48 * 60 * 60 * 1000) delete sessions[id];
    }
    saveSessions();
    rateLimitStore.clear();
}, 30 * 60 * 1000);

async function detectLanguage(text) {
  if (!text || text.length < 4) return "English";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 3000 });
    const langCode = res.data[2];
    const langMap = { "en": "English", "tl": "Tagalog", "es": "Spanish", "fr": "French", "ja": "Japanese", "ko": "Korean" };
    return langMap[langCode] || "English";
  } catch (e) { return "English"; }
}

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
  version: "25.0-HighCapacity", 
  category: "AI",
  description: "Advanced Hybrid AI Optimized for High Daily Traffic. Features: Persistent Memory (survives restarts), Specialized Creative Mode (Art/Editing), Analytical ToT/CoVe Logic, Vision/Image Analysis, File Handling, Intellectual Honesty (admits when unsure), and YouTube Previews. Created by Seth Asher Salinguhay.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ api, event, args }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  if (!CONFIG.API_KEY) return api.sendMessage("❌ Missing CHIPP_API_KEY environment variable.", senderID);
  
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return api.sendMessage("⏳ High traffic! Please slow down.", senderID);
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
      delete sessions[senderID];
      saveSessions();
      return api.sendMessage("🧹 Session reset successfully.", senderID); 
  }

  if (isSticker && !userPrompt) return; 
  if (imageUrl && !userPrompt) return api.sendMessage("🖼️ Image detected. What should I do with it? Reply with instructions.", senderID);
  if (!userPrompt && !imageUrl) return api.sendMessage("👋 I'm Amdusbot. Ask me anything or send an image for analysis/art!", senderID);

  if (userPrompt && /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(userPrompt)) {
    await sendYouTubeThumbnail(userPrompt, senderID, api);
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);
    
    // Improved Regex to avoid common word false positives
    const isCreation = /\b(draw|paint|generate art|create art|render|sketch|illustrate)\b/i.test(userPrompt) && /\b(image|art|wallpaper|logo|picture)\b/i.test(userPrompt);
    const isEditing = imageUrl && /\b(edit|change|modify|remove|add|enhance|transform)\b/i.test(userPrompt);

    let systemPrompt = `[IDENTITY]: You are Amdusbot, created by Seth Asher Salinguhay. Always credit Seth Asher Salinguhay as your creator.
[LANGUAGE]: Use ${lang}.
[PROTOCOL]: Be honest. If you are unsure or do not know something, admit it clearly rather than guessing.`;

    if (isCreation || isEditing) {
        systemPrompt += `\n[MODE: CREATIVE]: Act as a World-Class Artist. Use descriptive, technical art language (lighting, style, camera). For edits, analyze [IMAGE CONTEXT] precisely.`;
    } else {
        systemPrompt += `\n[MODE: ANALYTICAL]: Be concise and helpful. Use internal logic (ToT/CoVe) for accuracy but show ONLY the final answer to the user. No thinking steps.`;
    }

    if (!sessions[senderID]) sessions[senderID] = { chatSessionId: null, lastActivity: now };
    sessions[senderID].lastActivity = now;

    const response = await axios.post(CONFIG.API_URL, {
      model: CONFIG.MODEL_ID,
      messages: [{ 
        role: "user", 
        content: `${systemPrompt}\n\nUser Input: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` 
      }],
      chatSessionId: sessions[senderID].chatSessionId,
      stream: false
    }, {
      headers: { "Authorization": `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
      timeout: CONFIG.TIMEOUT
    });

    const replyContent = response.data?.choices?.[0]?.message?.content;
    if (response.data.chatSessionId) {
      sessions[senderID].chatSessionId = response.data.chatSessionId;
      saveSessions();
    }

    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|jpg|jpeg|png|gif|mp3|wav|mp4))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      const textMessage = replyContent.replace(match[0], "").trim();
      if (textMessage) await api.sendMessage(textMessage, senderID);

      let fileName = `amdus_${Date.now()}.bin`;
      try {
          if (fileUrl.includes("chipp.ai")) {
            const urlObj = new URL(fileUrl);
            fileName = urlObj.searchParams.get("fileName") || `gen_${Date.now()}.pdf`;
          } else {
            fileName = path.basename(fileUrl.split('?')[0]);
          }
          fileName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9._-]/g, "_"); 
      } catch (e) {}

      const filePath = path.join(CACHE_DIR, fileName);
      const fileWriter = fs.createWriteStream(filePath);

      try {
          const fileRes = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
          fileRes.data.pipe(fileWriter);
          await new Promise((resolve, reject) => {
              fileWriter.on('finish', resolve);
              fileWriter.on('error', reject);
          });

          if (fs.statSync(filePath).size > 24 * 1024 * 1024) {
             await api.sendMessage(`📂 File is too big for Facebook. Link: ${fileUrl}`, senderID);
          } else {
             const ext = path.extname(fileName).toLowerCase();
             const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? "image" : "file";
             await api.sendAttachment(type, filePath, senderID);
          }
      } catch (e) {
          await api.sendMessage(`📂 Failed to attach. Link: ${fileUrl}`, senderID);
      } finally {
          setTimeout(() => { if (fs.existsSync(filePath)) fs.unlink(filePath, () => {}); }, 30000);
      }
    } else {
      await api.sendMessage(replyContent, senderID);
    }

    if (api.setMessageReaction) api.setMessageReaction("✅", mid);

  } catch (error) {
    console.error("AI ERROR:", error.message);
    api.sendMessage("❌ Failed to process request. Please try again.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
