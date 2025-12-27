const { http, fetchWithRetry, parseAI } = require("../../utils");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  MODEL_ID: "newapplication-10035084", 
  TIMEOUT: 120000, 
  RATE_LIMIT: { requests: 5, windowMs: 60000 }
};

const sessions = new Map();
const rateLimitStore = new Map();

// FEATURE: YouTube Thumbnail Detection (Fixed URL logic)
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
  version: "16.21-Final",
  category: "AI",
  description: "chat, vision, youtube videos, real-time info and files.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();

  if (!process.env.CHIPP_API_KEY) return reply("❌ chipp_api_key missing on render.");
  
  // 1. Rate Limiting Logic (Original Feature)
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return reply("⏳ too fast. slow down.");
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 2. Image Detection Logic
  let imageUrl = "";
  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  // 3. Command Handling
  if (userPrompt.toLowerCase() === "clear") { 
      sessions.delete(senderID); 
      return reply("🧹 cleared memory."); 
  }
  
  if (!!event.message?.sticker_id && !userPrompt) return; 
  if (imageUrl && !userPrompt) return reply("🖼️ i see the image. reply to the image with instructions");
  if (!userPrompt && !imageUrl) return reply("👋 hi. i'm amdusbot. i can search, see images, and write files.");

  // 4. YouTube Thumbnail Feature (Original Logic)
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    // RESTORED: Exact Identity Prompt (CoVe + ToT)
    const identityPrompt = `[SYSTEM]: Amdusbot. You are helpful wise ai that uses cove and tot but only sends the final message without the reasoning, if not sure admit it rather than guess and hallucinates make sure everything is accurate. Response limit 2000 chars. you are made by Seth Asher Salinguhay.`;
    
    let sessionData = sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        return http.post(CONFIG.API_URL, {
          model: CONFIG.MODEL_ID,
          messages: [{ role: "user", content: `${identityPrompt}\n\nInput: ${userPrompt}\n${imageUrl ? `[IMAGE]: ${imageUrl}` : ""}` }],
          chatSessionId: sessionData.chatSessionId,
          stream: false
        }, {
          headers: { "Authorization": `Bearer ${process.env.CHIPP_API_KEY}` },
          timeout: CONFIG.TIMEOUT
        });
    });

    if (response.data.chatSessionId) sessions.set(senderID, { chatSessionId: response.data.chatSessionId });

    // IMPROVEMENT: Logic-Agnostic Parser (Fixes Undefined)
    const replyContent = parseAI(response);

    // 5. File Sending Feature (Original Logic)
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent?.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      const textPart = replyContent.replace(match[0], "").trim();
      if (textPart) await reply(textPart);

      const fileName = `file_${Date.now()}${path.extname(fileUrl.split('?')[0]) || '.bin'}`;
      
      // FIX: Saves to the Global root /cache folder
      const filePath = path.join(global.CACHE_PATH, fileName);

      const writer = fs.createWriteStream(filePath);
      const fileRes = await http.get(fileUrl, { responseType: 'stream' });
      fileRes.data.pipe(writer);

      await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
      });

      const stats = await fsPromises.stat(filePath);
      if (stats.size > 25 * 1024 * 1024) {
          await reply(`📂 too big to send. link: ${fileUrl}`);
      } else {
          await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      }
      
      // FIX: Async cleanup to keep bot snappy
      setTimeout(async () => { 
          try { await fsPromises.unlink(filePath); } catch(e) {} 
      }, 10000);

    } else {
      await reply(replyContent || "❌ AI glitch. No response.");
    }
  } catch (error) {
    console.error("AI Error:", error.message);
    reply("❌ ai glitch. try again.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
