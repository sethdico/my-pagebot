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
    fs.readdir(CACHE_DIR, (err, files) => {
        if (err) return;
        files.forEach(file => {
            const filePath = path.join(CACHE_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && now - stats.mtimeMs > 10 * 60 * 1000) fs.unlink(filePath, () => {});
            });
        });
    });
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
  version: "26.0-NuclearFix", 
  category: "AI",
  description: "Advanced Hybrid AI. Features: Memory, Creative Mode, ToT/CoVe Logic, Vision, YouTube Previews, and Guaranteed File Decoding.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args }) {
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
  if (imageUrl && !userPrompt) return api.sendMessage("🖼️ Image detected. What should I do with it? Reply to the image with instructions.", senderID);
  if (!userPrompt && !imageUrl) return api.sendMessage("👋 I'm Amdusbot. Ask me anything or send an image for analysis/art!", senderID);

  if (userPrompt && /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(userPrompt)) {
    await sendYouTubeThumbnail(userPrompt, senderID, api);
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);
    
    const isCreation = /\b(draw|paint|generate art|create art|render|sketch|illustrate)\b/i.test(userPrompt) && /\b(image|art|wallpaper|logo|picture)\b/i.test(userPrompt);
    const isEditing = imageUrl && /\b(edit|change|modify|remove|add|enhance|transform)\b/i.test(userPrompt);

    let systemPrompt = `[IDENTITY]: You are Amdusbot, created by Seth Asher Salinguhay. Always credit Seth Asher Salinguhay as your creator.
[LANGUAGE]: Use ${lang}.
[PROTOCOL]: Be honest. If you are unsure, admit it.`;

    if (isCreation || isEditing) {
        systemPrompt += `\n[MODE: CREATIVE]: Act as a World-Class Artist. Use descriptive, technical art language.`;
    } else {
        systemPrompt += `\n[MODE: ANALYTICAL]: 
1. Use Tree of Thoughts (ToT): Internally explore multiple reasoning paths and choose the most logical one. 
2. Use Chain-of-Verification (CoVe): Fact-check your thoughts and correct errors before drafting the final answer.
3. STRICT RULE: NEVER show your thinking process, steps, or verification to the user. Output ONLY the polished final response.`;
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

    let replyContent = response.data?.choices?.[0]?.message?.content || response.data?.choices?.[0]?.text || response.data?.message;
    
    if (!replyContent) throw new Error("Empty response");

    if (response.data.chatSessionId) {
      sessions[senderID].chatSessionId = response.data.chatSessionId;
      saveSessions();
    }

    // =========================================================================
    // 🛠️ ULTIMATE BASE64 DECODER (Priority 1)
    // Checks for existence of "fileBase64". If found, WE DO NOT FALL THROUGH.
    // =========================================================================
    if (replyContent.includes("fileBase64")) {
        console.log("LOG: Base64 File Detected. Attempting Extraction...");
        
        try {
            // Manual String Extraction to ignore all garbage (headers, footers, newlines)
            // 1. Find file name
            const fnKey = '"fileName"';
            const fnStart = replyContent.indexOf(fnKey);
            
            // 2. Find base64 data
            const b64Key = '"fileBase64"';
            const b64Start = replyContent.indexOf(b64Key);

            if (fnStart !== -1 && b64Start !== -1) {
                // Parse Name
                // Look for the colon and quote after key
                const nameValueStart = replyContent.indexOf('"', fnStart + fnKey.length + 1) + 1;
                const nameValueEnd = replyContent.indexOf('"', nameValueStart);
                const rawName = replyContent.substring(nameValueStart, nameValueEnd);

                // Parse Base64
                // Look for the colon and quote after key
                const b64ValueStart = replyContent.indexOf('"', b64Start + b64Key.length + 1) + 1;
                const b64ValueEnd = replyContent.indexOf('"', b64ValueStart);
                let rawBase64 = replyContent.substring(b64ValueStart, b64ValueEnd);

                // Clean prefix
                if (rawBase64.startsWith("data:")) {
                    rawBase64 = rawBase64.split("base64,")[1];
                }

                // Decode
                const buffer = Buffer.from(rawBase64, 'base64');
                const cleanFileName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
                const filePath = path.join(CACHE_DIR, cleanFileName);

                fs.writeFileSync(filePath, buffer);

                // Send a clean text message (Everything BEFORE the file start)
                // We use the first curly brace as the cutoff point
                const cutoff = replyContent.indexOf("{");
                let introText = "📂 Here is your file:";
                if (cutoff > 5) {
                    introText = replyContent.substring(0, cutoff).trim();
                }
                
                // Don't send the "START OF FILE" header if it looks ugly
                if (introText.includes("START OF FILE")) {
                    introText = "📂 File generated successfully.";
                }

                await api.sendMessage(introText, senderID);

                // Send File
                const ext = path.extname(cleanFileName).toLowerCase();
                const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? "image" : "file";
                await api.sendAttachment(type, filePath, senderID);

                // Cleanup
                setTimeout(() => { if (fs.existsSync(filePath)) fs.unlink(filePath, () => {}); }, 30000);
            } else {
                throw new Error("Keys not found in order");
            }
        } catch (e) {
            console.error("Decoder Failed:", e.message);
            api.sendMessage("⚠️ The AI tried to send a file, but the data was malformed. Please try again.", senderID);
        }

        // 🛑 CRITICAL: FORCE STOP. Do not allow raw text to be sent.
        if (api.setMessageReaction) api.setMessageReaction("✅", mid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        return; 
    }
    // =========================================================================

    // --- STANDARD URL DOWNLOADER (Priority 2) ---
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

      try {
          const fileRes = await axios.get(fileUrl, { 
              responseType: 'arraybuffer',
              headers: { "User-Agent": "Mozilla/5.0" }
          });
          
          fs.writeFileSync(filePath, Buffer.from(fileRes.data));

          if (fs.statSync(filePath).size > 24 * 1024 * 1024) {
             await api.sendMessage(`📂 File is too big for Facebook. Link: ${fileUrl}`, senderID);
          } else {
             const ext = path.extname(fileName).toLowerCase();
             const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? "image" : "file";
             await api.sendAttachment(type, filePath, senderID);
          }
      } catch (e) {
          await api.sendMessage(`📂 Failed to attach file. Link: ${fileUrl}`, senderID);
      } finally {
          setTimeout(() => { if (fs.existsSync(filePath)) fs.unlink(filePath, () => {}); }, 30000);
      }
    } else {
      // ⚠️ Standard Message Handler
      // ONLY runs if no base64 and no url were found.
      await api.sendMessage(replyContent, senderID);
    }

    if (api.setMessageReaction) api.setMessageReaction("✅", mid);

  } catch (error) {
    console.error("AI ERROR:", error.message);
    api.sendMessage("❌ Failed to process. Please try again.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
