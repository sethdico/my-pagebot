const axios = require("axios");
const fs = require("fs");
const fsPromises = require("fs").promises; // Non-blocking I/O
const path = require("path");

// === PATHS & STORAGE ===
const CACHE_DIR = path.join(__dirname, "cache");
const SESSION_FILE = path.join(__dirname, "ai_sessions.json");

// Sync mkdir is fine on startup only
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY,
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 120000,
  RATE_LIMIT: { requests: 15, windowMs: 60000 },
  MAX_FILE_SIZE: 10 * 1024 * 1024
};

// === STATIC REGEX (Compiles once for O(1) reuse) ===
const REGEX = {
  YOUTUBE: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  CREATION: /\b(draw|paint|generate art|create art|render|sketch|illustrate)\b/i,
  ART_CONTEXT: /\b(image|art|wallpaper|logo|picture)\b/i,
  EDITING: /\b(edit|change|modify|remove|add|enhance|transform)\b/i,
  JSON_FILE: /\{[\s\n]*"fileName"[\s\n]*:[\s\n]*"(.*?)"[\s\n]*,[\s\n]*"fileBase64"[\s\n]*:[\s\n]*"(.*?)"[\s\n]*\}/s,
  FILE_LINK: /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|jpg|jpeg|png|gif|mp3|wav|mp4))/i
};

// --- Memory Session Management ---
let sessions = {};
try {
  if (fs.existsSync(SESSION_FILE)) {
    sessions = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
  }
} catch (e) {
  sessions = {};
}

// Debounced Save
function saveSessions() {
  fsPromises
    .writeFile(SESSION_FILE, JSON.stringify(sessions, null, 2))
    .catch(() => {});
}

const rateLimitStore = new Map();

// --- Maintenance Task ---
setInterval(async () => {
  const now = Date.now();

  try {
    const files = await fsPromises.readdir(CACHE_DIR);
    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      const stats = await fsPromises.stat(filePath).catch(() => null);
      if (stats && now - stats.mtimeMs > 10 * 60 * 1000) {
        fsPromises.unlink(filePath).catch(() => {});
      }
    }
  } catch (e) {}

  const maxSessions = 500;
  const sessionKeys = Object.keys(sessions);

  if (sessionKeys.length > maxSessions) {
    sessionKeys
      .sort(
        (a, b) =>
          (sessions[a].lastActivity || 0) -
          (sessions[b].lastActivity || 0)
      )
      .slice(0, 100)
      .forEach((key) => delete sessions[key]);
  }

  for (const id in sessions) {
    if (now - sessions[id].lastActivity > 48 * 60 * 60 * 1000) {
      delete sessions[id];
    }
  }

  saveSessions();
  rateLimitStore.clear();
}, 30 * 60 * 1000);

// --- Helper: YouTube Thumbnail ---
function sendYouTubeThumbnail(youtubeUrl, senderID, api) {
  const match = youtubeUrl.match(REGEX.YOUTUBE);
  if (match && match[1]) {
    const thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    api.sendAttachment("image", thumbnailUrl, senderID).catch(() => {});
  }
}

module.exports.config = {
  name: "ai",
  author: "Sethdico",
  version: "32.0-Ultra-Optimized",
  category: "AI",
  description: "Advanced AI by SethDico.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  if (!CONFIG.API_KEY) {
    return api.sendMessage("❌ Missing CHIPP_API_KEY.", senderID);
  }

  // --- Rate Limiting ---
  const now = Date.now();
  let userTs = rateLimitStore.get(senderID);
  if (!userTs) {
    userTs = [];
    rateLimitStore.set(senderID, userTs);
  }

  const recentTs = userTs.filter(
    (ts) => now - ts < CONFIG.RATE_LIMIT.windowMs
  );
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) {
    return api.sendMessage("⏳ High traffic! Please slow down.", senderID);
  }
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // --- Input Analysis ---
  let imageUrl = "";
  const isSticker = !!event.message?.sticker_id;

  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
    imageUrl = event.message.attachments[0].payload?.url || "";
  } else if (
    event.message?.reply_to?.attachments?.[0]?.type === "image"
  ) {
    imageUrl = event.message.reply_to.attachments[0].payload?.url || "";
  }

  if (userPrompt.toLowerCase() === "clear") {
    delete sessions[senderID];
    saveSessions();
    return api.sendMessage("🧹 Session reset.", senderID);
  }

  if (isSticker && !userPrompt) return;
  if (!userPrompt && !imageUrl) {
    return api.sendMessage("👋 I'm Amdusbot. Ask me anything!", senderID);
  }

  if (userPrompt && REGEX.YOUTUBE.test(userPrompt)) {
    sendYouTubeThumbnail(userPrompt, senderID, api);
  }

  if (api.sendTypingIndicator) {
    api.sendTypingIndicator(true, senderID).catch(() => {});
  }

  try {
    const isCreation =
      REGEX.CREATION.test(userPrompt) &&
      REGEX.ART_CONTEXT.test(userPrompt);
    const isEditing = imageUrl && REGEX.EDITING.test(userPrompt);

    let systemPrompt = `[IDENTITY]: You are Amdusbot, created by Seth Asher Salinguhay.
[LANGUAGE]: Detect the user's language and respond in the same language.
[FILE FORMAT]: If asked to generate a file, output ONLY JSON: {"fileName": "x.txt", "fileBase64": "data:..."}`;

    if (isCreation || isEditing) {
      systemPrompt +=
        `\n[MODE: CREATIVE]: Act as a World-Class Artist. Use descriptive art language.`;
    } else {
      systemPrompt +=
        `\n[MODE: ANALYTICAL]: Use Tree of Thoughts (ToT). Verify facts. Output ONLY final response.`;
    }

    if (!sessions[senderID]) {
      sessions[senderID] = { chatSessionId: null, lastActivity: now };
    }
    sessions[senderID].lastActivity = now;

    const response = await axios.post(
      CONFIG.API_URL,
      {
        model: CONFIG.MODEL_ID,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\nUser Input: ${userPrompt}\n${
              imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""
            }`
          }
        ],
        chatSessionId: sessions[senderID].chatSessionId,
        stream: false
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: CONFIG.TIMEOUT
      }
    );

    const replyContent =
      response.data?.choices?.[0]?.message?.content ||
      response.data?.message;

    if (!replyContent) throw new Error("Empty response");

    if (response.data.chatSessionId) {
      sessions[senderID].chatSessionId = response.data.chatSessionId;
      saveSessions();
    }

    const match = replyContent.match(REGEX.JSON_FILE);

    if (match) {
      try {
        const fileName = match[1];
        let fileData = match[2];

        const cleanMessage = replyContent
          .replace(match[0], "")
          .replace(/```json|```/g, "")
          .trim();

        if (cleanMessage) {
          await api.sendMessage(cleanMessage, senderID);
        }

        if (fileData.includes("base64,")) {
          fileData = fileData.split("base64,")[1];
        }

        const buffer = Buffer.from(fileData, "base64");
        const sanitized = path.basename(
          fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
        );
        const filePath = path.join(CACHE_DIR, sanitized);

        await fsPromises.writeFile(filePath, buffer);

        const ext = path.extname(sanitized).toLowerCase();
        const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)
          ? "image"
          : "file";

        await api.sendAttachment(type, filePath, senderID);

        setTimeout(() => {
          fsPromises.unlink(filePath).catch(() => {});
        }, 60000);

        if (api.setMessageReaction && mid) {
          api.setMessageReaction("✅", mid).catch(() => {});
        }
        return;
      } catch (e) {
        console.error("Decoder Error:", e.message);
      }
    }

    const linkMatch = replyContent.match(REGEX.FILE_LINK);

    if (linkMatch) {
      const fileUrl = linkMatch[0].replace(/[).,]+$/, "");
      const textMessage = replyContent
        .replace(linkMatch[0], "")
        .trim();

      if (textMessage) {
        await api.sendMessage(textMessage, senderID);
      }

      const ext = path.extname(fileUrl).toLowerCase();
      const type = [".jpg", ".jpeg", ".png", ".gif"].includes(ext)
        ? "image"
        : "file";

      await api.sendAttachment(type, fileUrl, senderID);
    } else {
      await api.sendMessage(replyContent, senderID);
    }

    if (api.setMessageReaction && mid) {
      api.setMessageReaction("✅", mid).catch(() => {});
    }
  } catch (error) {
    console.error("AI ERROR:", error.message);
    api.sendMessage("❌ Failed to process. Please try again.", senderID);
  } finally {
    if (api.sendTypingIndicator) {
      api.sendTypingIndicator(false, senderID).catch(() => {});
    }
  }
};
