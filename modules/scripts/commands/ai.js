const { http, fetchWithRetry, parseAI } = require("../../utils");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

const sessions = new Map();

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
  name: "ai", author: "Sethdico", version: "16.85", category: "AI", description: "Advanced AI Assistant.", adminOnly: false, usePrefix: false, cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  
  // RAM Safety: Clear oldest session if memory is full
  if (sessions.size > 100) sessions.delete(sessions.keys().next().value);

  // Vision detection
  const currentImg = event.message?.attachments?.find(a => a.type === "image");
  const repliedImg = event.message?.reply_to?.attachments?.find(a => a.type === "image");
  let imageUrl = currentImg ? currentImg.payload.url : (repliedImg ? repliedImg.payload.url : "");

  if (imageUrl && !userPrompt && !event.message?.reply_to) {
    return reply("I see the image. Reply to it and type your instructions.");
  }
  if (!userPrompt && !imageUrl) return reply("hi. i'm amdusbot. i can search, see images, and write files.");

  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  if (userPrompt && youtubeRegex.test(userPrompt)) await sendYouTubeThumbnail(userPrompt, senderID, api);

  try {
    const identityPrompt = `[SYSTEM]: Amdusbot. You are helpful wise ai that uses cove and tot but only sends the final message without the reasoning, if not sure admit it rather than guess and hallucinates make sure everything is accurate. Response limit 2000 chars. you are made by Seth Asher Salinguhay.`;
    let sessionData = sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        const finalContent = imageUrl ? `${imageUrl}\n\n${userPrompt}` : userPrompt;
        const body = {
          model: "newapplication-10035084",
          messages: [{ role: "system", content: identityPrompt }, { role: "user", content: finalContent }],
          stream: false
        };
        if (sessionData.chatSessionId) body.chatSessionId = sessionData.chatSessionId;
        return http.post("https://app.chipp.ai/api/v1/chat/completions", body, { 
            headers: { "Authorization": `Bearer ${process.env.CHIPP_API_KEY}`, "Content-Type": "application/json" }
        });
    });

    if (response.data.chatSessionId) sessions.set(senderID, { chatSessionId: response.data.chatSessionId });
    const replyContent = parseAI(response);

    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent?.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, ""); 
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
  } catch (error) { reply("❌ AI glitch."); }
};
