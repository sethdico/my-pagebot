const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.CHIPP_API_KEY, 
  MODEL_ID: "newapplication-10034686",
  TIMEOUT: 120000,
  SESSION_TIMEOUT: 30 * 60 * 1000,
  RATE_LIMIT: { requests: 5, windowMs: 60000 }
};

const sessions = new Map();
const rateLimitStore = new Map();

async function detectLanguage(text) {
  try {
    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=${encodeURIComponent(text || "hi")}`, { timeout: 4000 });
    return { "en": "English", "tl": "Tagalog", "es": "Spanish" }[res.data[2]] || "English";
  } catch (e) { return "English"; }
}

module.exports.config = {
  name: "ai", author: "Sethdico", version: "15.0", category: "AI",
  description: "Multi-AI: Vision, Search, YouTube, and Documents."
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const userPrompt = args.join(" ").trim();
  if (!CONFIG.API_KEY) return api.sendMessage("❌ System: CHIPP_API_KEY missing.", senderID);

  // Rate Limiting
  const now = Date.now();
  const userTs = rateLimitStore.get(senderID) || [];
  const recentTs = userTs.filter(ts => now - ts < CONFIG.RATE_LIMIT.windowMs);
  if (recentTs.length >= CONFIG.RATE_LIMIT.requests) return api.sendMessage("⏳ Slow down! Wait a minute.", senderID);
  recentTs.push(now);
  rateLimitStore.set(senderID, recentTs);

  let imageUrl = event.message?.attachments?.[0]?.type === "image" ? event.message.attachments[0].payload.url : 
                 (event.message?.reply_to?.attachments?.[0]?.type === "image" ? event.message.reply_to.attachments[0].payload.url : "");

  if (imageUrl && !userPrompt && !event.message?.sticker_id) return api.sendMessage("What can I do with this image? Reply to it with instructions!", senderID);
  if (event.message?.sticker_id && !userPrompt) return;
  if (!userPrompt && !imageUrl) return api.sendMessage("👋 Hi! I'm Amdusbot. How can I help you?", senderID);

  if (userPrompt.toLowerCase() === "clear") { sessions.delete(senderID); return api.sendMessage("🧹 Memory wiped!", senderID); }
  
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const lang = await detectLanguage(userPrompt);
    const identityPrompt = `[IDENTITY]: Amdusbot by Sethdico. [TONE]: Smart kid genius student. [INSTRUCTIONS]: Reply in ${lang}. Cite sources. Provide RAW URLs for files. No markdown.`;

    let session = sessions.get(senderID) || { chatSessionId: null, lastActive: Date.now() };
    session.lastActive = Date.now();

    const response = await axios.post(CONFIG.API_URL, {
      model: CONFIG.MODEL_ID,
      messages: [{ role: "user", content: `${identityPrompt}\nUser: ${userPrompt}\n${imageUrl ? `[IMAGE]: ${imageUrl}` : ""}` }],
      chatSessionId: session.chatSessionId, stream: false
    }, { headers: { "Authorization": `Bearer ${CONFIG.API_KEY}` }, timeout: CONFIG.TIMEOUT });

    const reply = response.data?.choices?.[0]?.message?.content;
    if (response.data.chatSessionId) { session.chatSessionId = response.data.chatSessionId; sessions.set(senderID, session); }

    const fileRegex = /(https?:\/\/app\.chipp\.ai\/api\/downloads\/downloadFile[^)\s"]+|https?:\/\/(?!(?:scontent|static)\.xx\.fbcdn\.net)[^)\s"]+\.(?:pdf|docx|doc|xlsx|xls|pptx|ppt|txt|csv|zip|rar|7z|py|js|html|css|json|jpg|jpeg|png|gif|mp3|wav|mp4|mov|avi))/i;
    const match = reply.match(fileRegex);

    if (match) {
      const fileUrl = match[0].replace(/[).,]+$/, "");
      const cleanText = reply.replace(match[0], "").trim();
      if (cleanText) await api.sendMessage(cleanText, senderID);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      let fileName = fileUrl.includes("chipp.ai") ? (new URL(fileUrl).searchParams.get("fileName") || `file_${Date.now()}.bin`) : path.basename(fileUrl.split('?')[0]);
      fileName = decodeURIComponent(fileName);
      const filePath = path.join(cacheDir, fileName);

      const writer = fs.createWriteStream(filePath);
      const fileRes = await axios({ url: fileUrl, method: 'GET', responseType: 'stream' });
      fileRes.data.pipe(writer);
      await new Promise((r) => writer.on('finish', r));

      const stats = fs.statSync(filePath);
      if (stats.size > 24 * 1024 * 1024) {
          await api.sendMessage(`⚠️ File is too big for Messenger (25MB+). Download it here: ${fileUrl}`, senderID);
      } else {
          let type = [".jpg",".jpeg",".png",".gif"].includes(path.extname(fileName)) ? "image" : "file";
          await api.sendAttachment(type, filePath, senderID);
      }
      setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 60000);
    } else {
        await api.sendMessage(reply, senderID);
    }
  } catch (error) { api.sendMessage(`❌ AI Error: ${error.message}`, senderID); }
  finally { if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID); }
};
