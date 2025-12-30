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

// FEATURE: YouTube Thumbnail Detection
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
  version: "16.60-VisionFix",
  category: "AI",
  description: "Advanced AI with Vision, YouTube, and Files.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const apiKey = process.env.CHIPP_API_KEY;

  if (!apiKey) return reply("❌ chipp_api_key missing on render.");
  
  // 1. Rate Limiting
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return reply("⏳ Slow down.");
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  // 2. IMAGE DETECTION (Fixed: Grabs URL from current msg OR reply_to)
  let imageUrl = "";
  const currentImg = event.message?.attachments?.find(a => a.type === "image");
  const repliedImg = event.message?.reply_to?.attachments?.find(a => a.type === "image");

  if (currentImg) {
      imageUrl = currentImg.payload.url;
  } else if (repliedImg) {
      imageUrl = repliedImg.payload.url;
  }

  // 3. Flow Handling
  if (imageUrl && !userPrompt && !event.message?.reply_to) {
    return reply("🖼️ I see the image. Reply to it and type your instructions.");
  }
  if (!userPrompt && !imageUrl) return reply("👋 hi. i'm amdusbot. i can search, see images, and write files.");

  if (userPrompt.toLowerCase() === "clear") { 
      sessions.delete(senderID); 
      return reply("🧹 cleared memory."); 
  }

  // 4. YouTube Feature
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    // RESTORED: Identity Prompt with CoVe and ToT logic
    const identityPrompt = `[SYSTEM]: Amdusbot. You are helpful wise ai that uses cove and tot but only sends the final message without the reasoning, if not sure admit it rather than guess and hallucinates make sure everything is accurate. Response limit 2000 chars. you are made by Seth Asher Salinguhay.`;
    
    let sessionData = sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        const body = {
          model: CONFIG.MODEL_ID,
          messages: [
              { role: "system", content: identityPrompt },
              // FIXED: Explicitly providing the image link alongside the text
              { role: "user", content: `Instruction: ${userPrompt}${imageUrl ? `\n\n[USER ATTACHED IMAGE LINK]: ${imageUrl}\n(Please analyze this image link provided above to answer the user's instruction.)` : ""}` }
          ],
          stream: false
        };
        if (sessionData.chatSessionId) body.chatSessionId = sessionData.chatSessionId;

        return http.post(CONFIG.API_URL, body, {
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          timeout: CONFIG.TIMEOUT
        });
    });

    if (response.data.chatSessionId) sessions.set(senderID, { chatSessionId: response.data.chatSessionId });

    const replyContent = parseAI(response);
    if (!replyContent) return reply("❌ AI returned a blank response.");

    // 5. File/Image Generation Detection
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      const textPart = replyContent.replace(match[0], "").trim();
      if (textPart) await reply(textPart);

      const fileName = `file_${Date.now()}${path.extname(fileUrl.split('?')[0]) || '.bin'}`;
      const filePath = path.join(global.CACHE_PATH, fileName);

      const writer = fs.createWriteStream(filePath);
      const fileRes = await http.get(fileUrl, { responseType: 'stream' });
      fileRes.data.pipe(writer);

      await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
      });

      await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      setTimeout(async () => { try { await fsPromises.unlink(filePath); } catch(e) {} }, 10000);
    } else {
      await reply(replyContent);
    }
  } catch (error) {
    console.error("Chipp Vision Error:", error.message);
    reply("❌ AI glitch. Try again.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
