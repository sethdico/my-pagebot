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
  version: "25.9-AggressiveFix", 
  category: "AI",
  description: "Advanced Hybrid AI. Features: Memory, Creative Mode, ToT/CoVe Logic, Vision, YouTube Previews, and Safety-Net File Decoder.",
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

    // --- 🚨 SAFETY NET: CHECK IF IT LOOKS LIKE A FILE ---
    // This regex looks for the pattern "fileBase64" anywhere in the text.
    if (/fileBase64/i.test(replyContent)) {
        console.log("LOG: Potential file detected in response.");
        let decodedSuccessfully = false;

        try {
            // STRATEGY 1: CLEAN JSON PARSING
            // Find the outermost curly braces
            const firstBrace = replyContent.indexOf("{");
            const lastBrace = replyContent.lastIndexOf("}");
            
            if (firstBrace !== -1 && lastBrace !== -1) {
                let potentialJson = replyContent.substring(firstBrace, lastBrace + 1);
                
                // Aggressive cleaning: remove markdown blocks, newlines inside strings might break parse but we try
                potentialJson = potentialJson.replace(/```json/g, "").replace(/```/g, "").trim();

                let parsed;
                try {
                    parsed = JSON.parse(potentialJson);
                } catch (jsonErr) {
                    // JSON Parse failed (common with large strings or unescaped chars).
                    // Fallback to STRATEGY 2: REGEX EXTRACTION
                    console.log("LOG: JSON parse failed, trying regex.");
                }

                if (!parsed) {
                    // Regex Fallback
                    const nameMatch = potentialJson.match(/"fileName"\s*:\s*"([^"]+)"/);
                    const base64Match = potentialJson.match(/"fileBase64"\s*:\s*"([^"]+)"/);
                    if (nameMatch && base64Match) {
                        parsed = { fileName: nameMatch[1], fileBase64: base64Match[1] };
                    }
                }

                if (parsed && parsed.fileName && parsed.fileBase64) {
                    const cleanFileName = parsed.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
                    let base64Data = parsed.fileBase64;
                    
                    // Remove data URI prefix if present
                    if (base64Data.includes("base64,")) {
                        base64Data = base64Data.split("base64,")[1];
                    }

                    const buffer = Buffer.from(base64Data, 'base64');
                    const filePath = path.join(CACHE_DIR, cleanFileName);
                    fs.writeFileSync(filePath, buffer);

                    // Send the "Conversation" part (everything BEFORE the JSON)
                    // We avoid sending the JSON blob itself.
                    let textPart = replyContent.substring(0, firstBrace).trim();
                    if (textPart.length > 2) {
                        await api.sendMessage(textPart, senderID);
                    } else {
                        await api.sendMessage("📂 File Generated:", senderID);
                    }

                    // Send Attachment
                    const ext = path.extname(cleanFileName).toLowerCase();
                    const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? "image" : "file";
                    await api.sendAttachment(type, filePath, senderID);

                    // Cleanup
                    setTimeout(() => { if (fs.existsSync(filePath)) fs.unlink(filePath, () => {}); }, 30000);
                    decodedSuccessfully = true;
                }
            }
        } catch (e) {
            console.error("DECODER CRASH:", e.message);
        }

        if (decodedSuccessfully) {
            if (api.setMessageReaction) api.setMessageReaction("✅", mid);
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
            return; // ✅ EXIT SUCCESS
        } else {
            // 🛑 SAFETY STOP
            // If we detected "fileBase64" but FAILED to decode it, we MUST NOT send the raw text.
            // It will spam the user. Send an error instead.
            await api.sendMessage("⚠️ The AI generated a file, but I failed to process the data structure. Please try again.", senderID);
            return; // 🛑 EXIT FAILURE (Prevents raw text leak)
        }
    }

    // --- STANDARD URL DOWNLOADER ---
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
