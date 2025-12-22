const axios = require("axios");
const fs = require("fs");
const path = require("path");

const SESSION_FILE = path.join(__dirname, "gemini_sessions.json");
let sessions = {};
try { if (fs.existsSync(SESSION_FILE)) sessions = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8")); } catch (e) { sessions = {}; }

function save() { fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2)); }

module.exports.config = {
  name: "gemini",
  author: "Sethdico",
  version: "4.0-Standalone",
  category: "AI",
  description: "Google Gemini with standalone vision support.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  let prompt = args.join(" ").trim();
  let imageUrl = "";

  if (prompt.toLowerCase() === "clear") {
    delete sessions[senderID];
    save();
    return api.sendMessage("🧹 Gemini conversation reset.", senderID);
  }

  if (event.message?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.attachments[0].payload.url;
  } else if (event.message?.reply_to?.attachments?.[0]?.type === "image") {
    imageUrl = event.message.reply_to.attachments[0].payload.url;
  }

  if (!prompt && imageUrl) prompt = "Describe this image.";
  if (!prompt) return api.sendMessage("⚠️ Usage: gemini <question> (or reply to an image)", senderID);

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

  try {
    const res = await axios.get("https://norch-project.gleeze.com/api/gemini", {
      params: { prompt, imageurl: imageUrl },
      timeout: 60000
    });

    const reply = res.data.response || res.data.content || "❌ Empty response.";
    const title = imageUrl ? "👁️ Gemini Vision" : "🤖 Gemini AI";
    
    await api.sendMessage(`${title}\n───────────────\n${reply}`, senderID);

    if (!sessions[senderID]) sessions[senderID] = [];
    sessions[senderID].push({ role: "user", content: prompt });
    save();

  } catch (e) {
    api.sendMessage("❌ Gemini failed. Please check the connection.", senderID);
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
  }
};
