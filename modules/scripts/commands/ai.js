const { http, fetchWithRetry, parseAI } = require("../../utils");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

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
  name: "ai", author: "Sethdico", version: "17.70-Final", category: "AI", description: "Advanced Assistant.", adminOnly: false, usePrefix: false, cooldown: 0, 
};

module.exports.run = async function ({ event, args, api, reply }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  const apiKey = process.env.CHIPP_API_KEY;

  if (global.sessions.size > 100) global.sessions.delete(global.sessions.keys().next().value);

  const currentImg = event.message?.attachments?.find(a => a.type === "image")?.payload?.url;
  const repliedImg = event.message?.reply_to?.attachments?.find(a => a.type === "image")?.payload?.url;
  const imageUrl = currentImg || repliedImg || "";

  if (imageUrl && !userPrompt && !event.message?.reply_to) return reply("🖼️ I see the image. Reply to it and type your instructions.");
  if (!userPrompt && !imageUrl) return reply("hi. i'm amdusbot. how can i help?");

  if (userPrompt.toLowerCase().includes("youtube.com")) await sendYouTubeThumbnail(userPrompt, senderID, api);

  try {
    const identityPrompt = `[SYSTEM]: Amdusbot. You are helpful wise ai that uses cove and tot but only sends the final message without the reasoning, if not sure admit it rather than guess and hallucinates make sure everything is accurate. Response limit 2000 chars. you are made by Seth Asher Salinguhay.`;
    let sessionData = global.sessions.get(senderID) || { chatSessionId: null };

    const response = await fetchWithRetry(async () => {
        // FIXED RAW VISION: Identity + Image Link + Input
        const finalInput = `${identityPrompt}\n\n${imageUrl ? `IMAGE: ${imageUrl}\n\n` : ""}Input: ${userPrompt || "Describe this"}`;

        return http.post("https://app.chipp.ai/api/v1/chat/completions", {
          model: "newapplication-10035084",
          messages: [{ role: "user", content: finalInput }],
          chatSessionId: sessionData.chatSessionId,
          stream: false
        }, { headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" } });
    });

    if (response.data.chatSessionId) global.sessions.set(senderID, { chatSessionId: response.data.chatSessionId });
    const replyContent = parseAI(response);

    const fileRegex = /(https?:\/\/[^\s)]+\.(?:pdf|docx|xlsx|txt|jpg|jpeg|png|mp4|mp3|zip)(?:\?[^\s)]*)?)/i;
    const match = replyContent?.match(fileRegex);

    if (match) {
      const fileUrl = match[0];
      if (replyContent.replace(match[0], "").trim()) await reply(replyContent.replace(match[0], "").trim());
      const fileName = `file_${Date.now()}${path.extname(fileUrl.split('?')[0]) || '.bin'}`;
      const filePath = path.join(global.CACHE_PATH, fileName);
      const writer = fs.createWriteStream(filePath);
      const fileRes = await http.get(fileUrl, { responseType: 'stream' });
      fileRes.data.pipe(writer);
      await new Promise((res) => writer.on('finish', res));
      await api.sendAttachment(fileName.match(/\.(jpg|png|jpeg)$/i) ? "image" : "file", filePath, senderID);
      setTimeout(async () => { try { await fsPromises.unlink(filePath); } catch(e) {} }, 10000);
    } else { reply(replyContent || "❌ No response."); }
  } catch (error) { reply("❌ AI glitch."); }
};
