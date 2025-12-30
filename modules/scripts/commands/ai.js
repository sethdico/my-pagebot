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
  version: "16.30",
  category: "AI",
  description: "Advanced AI with image recognition/edit, real-time info, youtube videos and file generation.",
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

  // 2. Image Detection (Current or Reply)
  let imageUrl = "";
  const currentAttachments = event.message?.attachments;
  const replyAttachments = event.message?.reply_to?.attachments;

  if (currentAttachments?.[0]?.type === "image") {
    imageUrl = currentAttachments[0].payload.url;
  } else if (replyAttachments?.[0]?.type === "image") {
    imageUrl = replyAttachments[0].payload.url;
  }

  // 3. THE FLOW LOGIC
  // Case A: User sent an image but NO text (Initial Step)
  if (imageUrl && !userPrompt && currentAttachments) {
    return reply("🖼️ I see the image. Reply to it and type your instructions.");
  }

  // Case B: General help (No image, no text)
  if (!userPrompt && !imageUrl) {
    return reply("👋 hi. i'm amdusbot. i can search, see images, and write files.");
  }

  if (userPrompt.toLowerCase() === "clear") { 
      sessions.delete(senderID); 
      return reply("🧹 cleared memory."); 
  }

  // 4. YouTube Feature
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const identityPrompt = `[SYSTEM]: Amdusbot. You are helpful wise ai that uses cove and tot but only sends the final message without the reasoning, if not sure admit it rather than guess and hallucinates make sure everything is accurate. Response limit 2000 chars. you are made by Seth Asher Salinguhay.`;
    
    let sessionData = sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        const body = {
          model: CONFIG.MODEL_ID,
          messages: [
              { role: "system", content: identityPrompt },
              { role: "user", content: `Input: ${userPrompt}\n${imageUrl ? `[ATTACHED IMAGE URL]: ${imageUrl}` : ""}` }
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

    // 5. File Detection and Sending
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

      await new Promise((res, rej) => { writer.on('finish', res); writer.on('error', rej); });
      await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      setTimeout(async () => { try { await fsPromises.unlink(filePath); } catch(e) {} }, 10000);
    } else {
      await reply(replyContent);
    }
  } catch (error) {
    const errMsg = error.response?.data?.error || error.message;
    console.error("Chipp Error:", errMsg);
    reply("❌ AI glitch. Try again.");
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
