const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// === CONFIGURATION (Directly Aligned with your Model ID) ===
const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY, 
  MODEL_ID: "newapplication-10035084", // ✅ Updated to your Model ID
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
  version: "16.5-Final",
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
  
  // 1. Rate Limiting Check
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return api.sendMessage("⏳ Too fast! Please wait a moment.", senderID);
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 2. Multi-media Context (Vision)
  let imageUrl = "";
  const isSticker = !!event.message?.sticker_id;
  if (event.message?.attachments?.[0]?.type === "image" && !isSticker) {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  // 3. User Commands
  if (userPrompt.toLowerCase() === "clear") { 
      sessions.delete(senderID); 
      return api.sendMessage("🧹 Conversation memory cleared.", senderID); 
  }
  if (isSticker && !userPrompt) return; 
  if (imageUrl && !userPrompt) return api.sendMessage("🖼️ I see the image! What should I do?", senderID);
  if (!userPrompt && !imageUrl) return api.sendMessage("👋 Hi! I'm Amdusbot. I can search the web, see images, and write documents.", senderID);

  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    // 🧠 ADVANCED PROMPT (COVE + TREE OF THOUGHTS)
    const identityPrompt = `
[SYSTEM]: You are Amdusbot, an advanced AI Assistant by Sethdico.
[MODE]: Helpful, Concise, Intelligent.

[INTERNAL REASONING]:
- Use Tree of Thoughts: Internally explore multiple branches of reasoning for complex queries.
- Use Chain of Verification: Verify facts and logic before presenting the final answer.
- ONLY OUTPUT THE FINAL RESULT. Do not show your reasoning steps, verification branches, or internal self-correction.

[CAPABILITIES]:
1. VISION: Analyze images provided via URL context.
2. WEB SEARCH: Search for real-time information if needed. Cite sources clearly.
3. FILES: Generate .pdf, .docx, .txt, .xlsx if asked. Provide the RAW DIRECT URL only.

[INSTRUCTIONS]:
- Response limit: 2000 characters.
- "Who made you?": Answer "Seth Asher Salinguhay (Sethdico)".
`.trim();

    // 4. Session Retrieval (Continue Session Logic)
    let sessionData = sessions.get(senderID) || { chatSessionId: null };

    // 5. Construct API Body
    const requestBody = {
      model: CONFIG.MODEL_ID,
      messages: [{ 
        role: "user", 
        content: `${identityPrompt}\n\nUser Input: ${userPrompt}\n${imageUrl ? `[IMAGE CONTEXT]: ${imageUrl}` : ""}` 
      }],
      stream: false
    };

    if (sessionData.chatSessionId) {
      requestBody.chatSessionId = sessionData.chatSessionId;
    }

    const response = await axios.post(CONFIG.API_URL, requestBody, {
      headers: { 
        "Authorization": `Bearer ${CONFIG.API_KEY}`, 
        "Content-Type": "application/json" 
      },
      timeout: CONFIG.TIMEOUT
    });

    // Save chatSessionId for future conversation context
    if (response.data.chatSessionId) {
      sessions.set(senderID, { chatSessionId: response.data.chatSessionId });
    }

    const replyContent = response.data?.choices?.[0]?.message?.content || "";

    // 6. File Handling & Base64 Instruction
    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|jpg|jpeg|png|gif|mp3|wav|mp4))/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      
      // ✅ Custom message as requested
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
             await api.sendMessage(`📂 File is too large for Messenger. Download here: ${fileUrl}`, senderID);
          } else {
             const ext = path.extname(fileName).toLowerCase();
             const type = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? "image" : "file";
             await api.sendAttachment(type, filePath, senderID);
          }
      } catch (err) {
          await api.sendMessage(`📂 Error attaching file. Direct link: ${fileUrl}`, senderID);
      } finally {
          setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60000);
      }
    } else {
      // Send Normal Response
      await api.sendMessage(replyContent, senderID);
    }

    if (api.setMessageReaction) api.setMessageReaction("✅", mid);

  } catch (error) {
    const errData = error.response?.data;
    const errMessage = errData?.error || error.message;

    console.error(`[AI Error] Status: ${error.response?.status} - ${errMessage}`);

    let userFacingError = "❌ AI is currently unavailable. Try again later.";
    
    if (error.response?.status === 401) userFacingError = "❌ API Error: Invalid/Unauthorized Key.";
    if (error.response?.status === 403) userFacingError = "❌ API Error: Chipp.ai Pro/Paid plan required.";

    api.sendMessage(userFacingError, senderID);
    if (api.setMessageReaction) api.setMessageReaction("❌", mid);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
