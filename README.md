# 🤖 Amdusbot/My-pagebot
The Ultimate High-Performance Multi-AI Messenger Assistant

Amdusbot is a blazing-fast Facebook Messenger bot with instant command execution, admin management, and AI features.

## 🚀 Key Features
- *Hybrid AI Brain*: Switches between Analytical and Creative modes
- *O(1) Command Lookup*: Map-based registry for instant responses
- *Admin Security*: Ban/Unban system and restricted commands
- *Smart UX*: Paginated help, interactive buttons, and joke delays

## 📂 Structure
sethdico-my-pagebot/
├── modules/scripts/commands/ # bot commands (.js)
├── page/src/ # Facebook API wrappers
├── index.js # server entry
├── launcher.js # auto-restart
├── webhook.js # event listener
└── config.json # credentials

## 🛠️ Setup
1. Fill `config.json`:
{
  "PAGE_ACCESS_TOKEN": "...",
  "VERIFY_TOKEN": "...",
  "PREFIX": "/",
  "ADMINS": ["YOUR_PSID"],
  "API_VERSION": "v21.0"
}

2. Deploy to Render:
- Set env vars: `PAGE_ACCESS_TOKEN`, `CHIPP_API_KEY`
- Start command: `node launcher.js`
- Webhook: `https://your-app.onrender.com/webhook`

## 👮 Admin Commands
- `uid`: Get user ID
- `ban <ID>`: Block user
- `unban <ID>`: Restore access
- `admin list`: View banned users

Made by Seth Asher Salinguhay (Sethdico). Respect API limits.
