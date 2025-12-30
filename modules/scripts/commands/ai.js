const { http, fetchWithRetry, parseAI } = require("../../utils");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  MODEL_ID: "newapplication-10035084", 
  TIMEOUT: 120000
};

// FEATURE: YouTube Thumbnail Detection (Fixed URL Typo)
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
  version: "16.96-VisionFinal", 
  category: "AI", 
  description: "Advanced Assistant with fixed vision triggers.", 
  adminOnly: false, 
  usePrefix: false, 
  cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const apiKey = process.env.CHIPP_API_KEY;

  if (!apiKey) return reply("❌ chipp_api_key missing on render.");

  // RAM Safety: Clear oldest session if memory is full
  if (!global.sessions) global.sessions = new Map();
  if (global.sessions.size > 100) global.sessions.delete(global.sessions.keys().next().value);

  // 1. IMPROVED VISION DETECTION
  const currentImg = event.message?.attachments?.find(a => a.type === "image");
  const repliedImg = event.message?.reply_to?.attachments?.find(a => a.type === "image");
  let imageUrl = currentImg ? currentImg.payload.url : (repliedImg ? repliedImg.payload.url : "");

  // Flow control: If it's a new image with no text, ask for instructions.
  if (imageUrl && !userPrompt && !event.message?.reply_to) {
    return reply("🖼️ I see the image. Reply to it and type your instructions.");
  }
  
  // If no text and no image, send help message.
  if (!userPrompt && !imageUrl) return reply("👋 hi. i'm amdusbot. i can search, see images, and write files.");

  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const identityPrompt = `[SYSTEM]: Amdusbot. You are helpful wise ai that uses cove and tot but only sends the final message without the reasoning, if not sure admit it rather than guess and hallucinates make sure everything is accurate. Response limit 2000 chars. you are made by Seth Asher Salinguhay.`;
    let sessionData = global.sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        // THE VISION KEY: Putting the URL in a separate block so the AI Agent can't miss it.
        const finalInput = imageUrl 
            ? `[IMAGE_URL]: ${imageUrl}\n\nUSER_INSTRUCTION: ${userPrompt || "Describe this image."}`
            : userPrompt;

        const body = {
          model: CONFIG.MODEL_ID,
          messages: [
              { role: "system", content: identityPrompt }, 
              { role: "user", content: finalInput }
          ],
          stream: false
        };
        if (sessionData.chatSessionId) body.chatSessionId = sessionData.chatSessionId;

        return http.post(CONFIG.API_URL, body, { 
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }
        });
    });

    if (response.data.chatSessionId) global.sessions.set(senderID, { chatSessionId: response.data.chatSessionId });
    const replyContent = parseAI(response);

    // 2. FILE GENERATION LOGIC
    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent?.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
      const textOnly = replyContent.replace(match[0], "").trim();
      if (textOnly) await reply(textOnly);

      const fileName = `file_${Date.now()}${path.extname(fileUrl.split('?')[0]) || '.bin'}`;
      const filePath = path.join(global.CACHE_PATH, fileName);
      
      const writer = fs.createWriteStream(filePath);
      const fileRes = await http.get(fileUrl, { responseType: 'stream' });
      fileRes.data.pipe(writer);

      await new Promise((res) => writer.on('finish', res));
      await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      
      setTimeout(async () => { try { await fsPromises.unlink(filePath); } catch(e) {} }, 10000);
    } else {
      await reply(replyContent || "❌ API offline.");
    }
  } catch (error) { 
      console.error("AI Error:", error.message);
      reply("❌ AI glitch."); 
  } finally {
      if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
