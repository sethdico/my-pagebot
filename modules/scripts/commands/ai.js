const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === CONFIGURATION ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY, 
  MODEL_ID: "newapplication-10034686", // Your App ID
  TIMEOUT: 120000, 
  RATE_LIMIT: { requests: 5, windowMs: 60000 }
};

const sessions = new Map();
const rateLimitStore = new Map();

// === HELPERS ===
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
  version: "16.5-Stable",
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
  
  // 1. Rate Limiting
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return api.sendMessage("⏳ Too fast! Please wait a moment.", senderID);
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 2. Image Handling
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

  // 3. YouTube Check
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    // Advanced reasoning instructions (COVE + ToT)
    const identityPrompt = `
[SYSTEM]: You are Amdusbot, an advanced AI Assistant by Sethdico.
[MODE]: Helpful, Concise, Intelligent.

[INTERNAL REASONING]:
- Use Tree of Thoughts: Explore multiple reasoning paths internally.
- Use Chain of Verification: Self-correct and verify facts before final output.
- Only provide the final, most accurate answer. Do not show reasoning steps.

[CAPABILITIES]:
1. VISION: Analyze image URLs provided in [IMAGE CONTEXT].
2. WEB SEARCH: Cite sources if using real-time info.
3. FILES: Generate .pdf, .docx, .txt, .xlsx if requested.
   - RAW URL ONLY for files. NEVER use markdown [Link](url).

[INSTRUCTIONS]:
- Keep responses under 2000 characters.
- If asked "Who made you?", answer: "Seth Asher Salinguhay (Sethdico)".
`.trim();

    // Get existing session for conversation continuity
    let userSession = sessions.get(senderID) || { chatSessionId: null };

    const requestBody = {
      model: CONFIG.MODEL_ID,
      messages: [{ 
        role: "user", 
        content: `${identityPrompt}\n\nUser Input: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` 
      }],
      stream: false
    };

    // Include session ID if we have one (as per Chipp API docs)
    if (userSession.chatSessionId) {
      requestBody.chatSessionId = userSession.chatSessionId;
    }

    const response = await axios.post(CONFIG.API_URL, requestBody, {
      headers: { 
        "Authorization": `Bearer ${CONFIG.API_KEY}`, 
        "Content-Type": "application/json" 
      },
      timeout: CONFIG.TIMEOUT
    });

    // Store the new chatSessionId for follow-up questions
    if (response.data.chatSessionId) {
      sessions.set(senderID, { chatSessionId: response.data.chatSessionId });
    }

    const replyContent = response.data?.choices?.[0]?.message?.content || "";
    
    // 4. Robust File Detection & Handling
    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|jpg|jpeg|png|gif|mp3|wav|mp4))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      
      // Instruction as requested
      await api.sendMessage("the file is in Base64 you either decode it using me via pasting", senderID);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      let fileName = "file.bin";
      try {
          const urlObj = new URL(fileUrl);
          fileName = urlObj.searchParams.get("fileName") || `amdus_gen_${Date.now()}.pdf`;
          fileName = decodeURIComponent(fileName).replace(/[^a-zA-Z0-9._-]/g, "_"); 
      } catch (e) { fileName = `file_${Date.now()}.bin`; }

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
             await api.sendMessage(`📂 File too large (Over 25MB).\nLink: ${fileUrl}`, senderID);
          } else {
             const ext = path.extname(fileName).toLowerCase();
             const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? "image" : "file";
             await api.sendAttachment(type, filePath, senderID);
          }
      } catch (err) {
          await api.sendMessage(`📂 Couldn't attach file. Link: ${fileUrl}`, senderID);
      } finally {
          setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60000);
      }
    } else {
      await api.sendMessage(replyContent, senderID);
    }

    if (api.setMessageReaction) api.setMessageReaction("✅", mid);

  } catch (error) {
    console.error("AI Error:", error.response?.data || error.message);
    let errorMsg = "❌ I encountered a glitch. Please ask again.";
    
    if (error.response?.status === 403) {
      errorMsg = "❌ API Error: Paid plan required on Chipp.ai to use this service.";
    } else if (error.response?.status === 401) {
      errorMsg = "❌ API Error: Invalid API Key.";
    }

    api.sendMessage(errorMsg, senderID);
    if (api.setMessageReaction) api.setMessageReaction("❌", mid);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
