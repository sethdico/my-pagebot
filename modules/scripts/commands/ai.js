const axios = require("axios");
const fs = require("fs");
const path = require("path");

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
  RATE_LIMIT: { requests: 15, windowMs: 60000 },
  MAX_FILE_SIZE: 10 * 1024 * 1024 // 10MB limit
};

// --- Persistent Session Management ---
let sessions = {};
try {
  if (fs.existsSync(SESSION_FILE)) {
    sessions = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
  }
} catch (e) {
  sessions = {};
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
  } catch (e) {
    console.error("Session save error:", e.message);
  }
}

const rateLimitStore = new Map();

// --- Maintenance Task (Cleanup) ---
setInterval(() => {
  const now = Date.now();
  
  // Clean cache files
  fs.readdir(CACHE_DIR, (err, files) => {
    if (err) return;
    files.forEach((file) => {
      const filePath = path.join(CACHE_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (!err && now - stats.mtimeMs > 10 * 60 * 1000) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
  
  // Limit max sessions and cleanup old ones
  const maxSessions = 500;
  const sessionKeys = Object.keys(sessions);
  if (sessionKeys.length > maxSessions) {
    const sorted = sessionKeys.sort((a, b) => (sessions[a].lastActivity || 0) - (sessions[b].lastActivity || 0));
    sorted.slice(0, 100).forEach(key => delete sessions[key]);
  }
  
  saveSessions();
  rateLimitStore.clear();
}, 30 * 60 * 1000);

// --- Helper Functions ---
async function detectLanguage(text) {
  if (!text || text.length < 4) return "English";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, { timeout: 3000 });
    const langCode = res.data[2];
    const langMap = { en: "English", tl: "Tagalog", es: "Spanish", fr: "French", ja: "Japanese", ko: "Korean" };
    return langMap[langCode] || "English";
  } catch (e) {
    return "English";
  }
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
  version: "31.0-Fixed-Standalone",
  category: "AI",
  description: "Advanced Hybrid AI with Memory and Secure File Handling.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  if (!CONFIG.API_KEY) {
    return api.sendMessage("❌ Missing CHIPP_API_KEY environment variable.", senderID);
  }

  // Rate limiting
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter((ts) => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) {
    return api.sendMessage("⏳ High traffic! Please slow down.", senderID);
  }
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
  if (imageUrl && !userPrompt) {
    return api.sendMessage("🖼️ Image detected. Reply to the image with instructions on what to do.", senderID);
  }
  if (!userPrompt && !imageUrl) {
    return api.sendMessage("👋 I'm Amdusbot. Ask me anything or send an image for analysis!", senderID);
  }

  if (userPrompt && /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(userPrompt)) {
    await sendYouTubeThumbnail(userPrompt, senderID, api);
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);
    const isCreation = /\b(draw|paint|generate|create|render|sketch)\b/i.test(userPrompt);

    let systemPrompt = `[IDENTITY]: Amdusbot by Seth Asher Salinguhay. Always credit him as creator.\n[LANGUAGE]: ${lang}.`;
    if (isCreation) {
      systemPrompt += `\n[MODE]: Creative Artist. Use descriptive art language.`;
    } else {
      systemPrompt += `\n[MODE]: Analytical. Use Tree of Thoughts and Chain-of-Verification. Output ONLY the polished final response.`;
    }

    if (!sessions[senderID]) {
      sessions[senderID] = { chatSessionId: null, lastActivity: now };
    }
    sessions[senderID].lastActivity = now;

    const response = await axios.post(
      CONFIG.API_URL,
      {
        model: CONFIG.MODEL_ID,
        messages: [{ role: "user", content: `${systemPrompt}\n\nUser Input: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` }],
        chatSessionId: sessions[senderID].chatSessionId,
        stream: false,
      },
      {
        headers: { Authorization: `Bearer ${CONFIG.API_KEY}`, "Content-Type": "application/json" },
        timeout: CONFIG.TIMEOUT,
      }
    );

    let replyContent = response.data?.choices?.[0]?.message?.content || response.data?.message;
    if (!replyContent) throw new Error("Empty response");

    if (response.data.chatSessionId) {
      sessions[senderID].chatSessionId = response.data.chatSessionId;
      saveSessions();
    }

    // --- BASE64 DECODER ---
    if (/fileBase64/i.test(replyContent)) {
      try {
        const base64Regex = /["']?fileBase64["']?\s*:\s*["']([\s\S]*?)["']/;
        const fileNameRegex = /["']?fileName["']?\s*:\s*["']([\s\S]*?)["']/;

        const base64Match = replyContent.match(base64Regex);
        const fileNameMatch = replyContent.match(fileNameRegex);

        if (base64Match) {
          let rawBase64 = base64Match[1].replace(/^.*base64,/, "").replace(/\s/g, "");
          const fileName = fileNameMatch ? fileNameMatch[1] : `file_${Date.now()}.png`;

          if (rawBase64.length > CONFIG.MAX_FILE_SIZE * 1.5) throw new Error("File too large");

          const buffer = Buffer.from(rawBase64, "base64");
          const sanitized = path.basename(fileName.replace(/[^a-zA-Z0-9._-]/g, "_"));
          const filePath = path.join(CACHE_DIR, sanitized);

          fs.writeFileSync(filePath, buffer);

          let chatText = replyContent.split(/{/)[0].replace(/```json|```/g, "").trim();
          if (chatText) await api.sendMessage(chatText, senderID);

          const ext = path.extname(sanitized).toLowerCase();
          const type = [".jpg", ".jpeg", ".png", ".gif"].includes(ext) ? "image" : "file";
          await api.sendAttachment(type, filePath, senderID);
          return;
        }
      } catch (e) {
        console.error("Decoder Error:", e.message);
      }
    }

    // --- URL DOWNLOADER ---
    const fileRegex = /(https?:\/\/[^\s"]+\.(?:pdf|docx|zip|jpg|jpeg|png|gif|mp3|mp4))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0];
      const textMessage = replyContent.replace(fileUrl, "").trim();
      if (textMessage) await api.sendMessage(textMessage, senderID);
      const ext = path.extname(fileUrl).toLowerCase();
      const type = [".jpg", ".jpeg", ".png", ".gif"].includes(ext) ? "image" : "file";
      return await api.sendAttachment(type, fileUrl, senderID);
    }

    // --- DEFAULT TEXT ---
    await api.sendMessage(replyContent, senderID);
    if (api.setMessageReaction) api.setMessageReaction("✅", mid);

  } catch (error) {
    console.error("AI Error:", error.message);
    api.sendMessage("❌ Failed to process. Please try again.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
