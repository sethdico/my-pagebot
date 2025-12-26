const http = require("../../utils");
// We need standard 'fs' for streams (fast writing) AND 'promises' for stats
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { URL } = require("url");

const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY, 
  MODEL_ID: "newapplication-10035084", 
  TIMEOUT: 120000, 
  RATE_LIMIT: { requests: 5, windowMs: 60000 }
};

// Session management with auto-cleanup logic handled in run
const sessions = new Map();
const rateLimitStore = new Map();

// Helper: Secure Filename Sanitization
const getSafeFilename = (urlStr) => {
    try {
        const urlObj = new URL(urlStr);
        let fileName = urlObj.searchParams.get("fileName") || path.basename(urlObj.pathname) || `file_${Date.now()}`;
        fileName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9._-]/g, "_"); // Remove dangerous chars
        // Ensure extension is safe
        const ext = path.extname(fileName).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.mp4', '.mp3', '.zip'].includes(ext)) {
            return `file_${Date.now()}.bin`; 
        }
        return fileName;
    } catch (e) { return `file_${Date.now()}.bin`; }
};

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
  version: "16.9-Fast",
  category: "AI",
  description: "chat, vision, youtube videos, real-time info and files.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const mid = event.message?.mid;

  if (!CONFIG.API_KEY) return reply("❌ chipp_api_key missing on render.");
  
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return reply("⏳ too fast. slow down.");
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // Session Memory Cleanup (Keep only last 50 active users to prevent RAM leak)
  if (sessions.size > 50) {
      const oldestKey = sessions.keys().next().value;
      sessions.delete(oldestKey);
  }

  let imageUrl = "";
  const isSticker = !!event.message?.sticker_id;
  
  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  if (userPrompt.toLowerCase() === "clear") { 
      sessions.delete(senderID); 
      return reply("🧹 cleared memory."); 
  }
  
  if (isSticker && !userPrompt) return; 
  if (imageUrl && !userPrompt) return reply("🖼️ i see the image. reply to the image with instructions");
  if (!userPrompt && !imageUrl) return reply("👋 hi. i'm amdusbot. i can search, see images, and write files.");

  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const identityPrompt = `[SYSTEM]: Amdusbot. You are helpful wise ai that uses cove and tot but only sends the final message without the reasoning, if not sure admit it rather than guess and hallucinates make sure everything is accurate. Response limit 2000 chars. you are made by Seth Asher Salinguhay.`;
    let sessionData = sessions.get(senderID) || { chatSessionId: null };

    // ---------------------------------------------------------
    // FEATURE RESTORED: Using fetchWithRetry for Auto-Resilience
    // ---------------------------------------------------------
    const response = await http.fetchWithRetry(async () => {
        return http.post(CONFIG.API_URL, {
          model: CONFIG.MODEL_ID,
          messages: [{ role: "user", content: `${identityPrompt}\n\nInput: ${userPrompt}\n${imageUrl ? `[IMAGE]: ${imageUrl}` : ""}` }],
          chatSessionId: sessionData.chatSessionId,
          stream: false
        }, {
          headers: { "Authorization": `Bearer ${CONFIG.API_KEY}` },
          timeout: CONFIG.TIMEOUT
        });
    });

    if (response.data.chatSessionId) sessions.set(senderID, { chatSessionId: response.data.chatSessionId });

    const replyContent = response.data?.choices?.[0]?.message?.content || "";
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      const textPart = replyContent.replace(match[0], "").trim();
      if (textPart) await reply(textPart);

      const fileName = getSafeFilename(fileUrl);
      const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(path.extname(fileName));

      const cacheDir = path.join(__dirname, "cache");
      await fsPromises.mkdir(cacheDir, { recursive: true }); 
      const filePath = path.join(cacheDir, fileName);
      
      // ---------------------------------------------------------
      // FIXED: Standard FS Create Write Stream (No crash)
      // ---------------------------------------------------------
      const writer = fs.createWriteStream(filePath);
      const fileRes = await http({ url: fileUrl, method: 'GET', responseType: 'stream' });
      fileRes.data.pipe(writer);

      await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
      });

      const stats = await fsPromises.stat(filePath);
      if (stats.size > 25 * 1024 * 1024) {
          await reply(`📂 too big to send. link: ${fileUrl}`);
      } else {
          await api.sendAttachment(isImage ? "image" : "file", filePath, senderID);
      }
      
      // Clean up file asynchronously after 10s
      setTimeout(() => fsPromises.unlink(filePath).catch(()=>{}), 10000);
    } else {
      await reply(replyContent);
    }
  } catch (error) {
    console.error("AI Error:", error.message);
    reply("❌ ai glitch. try again.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
