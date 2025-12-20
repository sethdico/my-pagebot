# 🤖 Amdusbot V15.0
**The Ultimate Multi-AI Messenger Assistant**

Amdusbot is a highly optimized Facebook Messenger bot designed for productivity, creativity, and natural conversation.

## 🌟 Key Capabilities
- **Multi-AI Brain**: Powered by Chipp.ai with real-time web access and cited sources.
- **Natural Interaction**: Talk to the bot like a human—no prefixes needed for AI chat.
- **Vision & Analysis**: Analyzes photos sent directly or as replies.
- **Document Master**: Generates .pdf, .docx, .txt, and .xlsx files and sends them as real attachments.
- **YouTube Link Summarizer**: Detects YouTube links to provide thumbnails and quick video summaries.
- **Multimedia Support**: Download TikTok videos and generate AI Art.

## ⚙️ How It Works (The Logic)
1. **Request Flow**: Facebook ping → `webhook.js` (logs & prunes data) → `page/main.js` (loads API tools) → `page/handler.js` (the brain).
2. **Smart Fallback**: The handler checks for specific commands first. If none are found, it automatically triggers the `ai.js` command.
3. **File Handling**: When the AI provides a download link, the bot downloads the file to a `cache` folder, verifies the size is under 25MB, uploads it to Facebook, and deletes the local copy after 60 seconds.
4. **Privacy**: All tokens are hidden in Render Environment Variables.

## 🛠️ Installation
1. **Deploy**: Connect this repository to [Render.com](https://render.com).
2. **Configure Environment Variables**:
   - `PAGE_ACCESS_TOKEN`: Your FB Page Token.
   - `CHIPP_API_KEY`: Your Chipp.ai Key.
   - `VERIFY_TOKEN`: Your webhook password.
3. **Webhook Setup**: Use `https://your-app.onrender.com/webhook` in Meta Developers.

## 👑 Credits
Developed by **Seth Asher Salinguhay (Sethdico)**.
