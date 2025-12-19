module.exports.config = {
  name: "help",
  version: "1.0",
  author: "Sethdico",
  role: 0,
  category: "utility",
  description: "Show help menu or info about a specific command.",
  usage: "[command]",
  hasPrefix: false,
  aliases: ["h"]
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, senderID, messageID } = event;
  const commandName = args[0]?.toLowerCase();

  // If user types "help ai", show AI-specific help
  if (commandName === "ai") {
    const helpMessage = `🤖 **Amdusbot AI — Full Capabilities**  

📸 **Image Analysis**  
→ Send a photo and ask:  
   • "What’s in this image?"  
   • "Describe this in detail"  
   • "Turn this into anime style"  

🎥 **YouTube Summarization**  
→ Paste any YouTube link → I’ll:  
   • Show a thumbnail 🖼️  
   • Summarize the video in your language  

🌐 **Real-Time Web Search**  
→ Ask: "Latest news about AI" or "Who won the 2024 election?"  
→ I search live and cite sources!  

📄 **File & Document Creation**  
→ Request:  
   • "Make a resume in PDF"  
   • "Generate Python code for a chatbot"  
   • "Create an Excel sales tracker"  
→ I send a direct download link!  

🎨 **AI Image Generation**  
→ Say: "Draw a cyberpunk cat" → I’ll generate & send the image!  

🌍 **Automatic Language Support**  
→ I detect your language (English, Tagalog, Spanish, etc.)  
→ And always reply in **your language**!  

⚡ **Smart & Safe**  
→ No spam: 5 messages/minute/user  
→ All files scanned & cleaned before sending  
→ Memory cleared with “clear”  

💡 **Just type your request!**  
Examples:  
• “Summarize this video: [YouTube link]”  
• (Send photo) + “What breed is this dog?”  
• “Create a birthday invitation in Tagalog”  

✨ Made with ❤️ by Sethdico`;

    return api.sendMessage(helpMessage, threadID);
  }

  // Optional: Add general help fallback later
  // For now, if not "help ai", you can leave blank or show main menu
  return api.sendMessage("📘 Use: help ai → to see AI features", threadID);
};
