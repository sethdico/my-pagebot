const studyVault = new Map();

module.exports.config = {
  name: "study",
  author: "Sethdico",
  version: "2.0",
  category: "Education",
  description: "Academic toolkit for summarizing and quizzing.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const userInput = args.join(" ").trim();
  const payload = event.postback?.payload;

  if (userInput && !payload) {
    studyVault.set(senderID, userInput);
    const buttons = [
      { type: "postback", title: "📝 Summarize", payload: "STUDY_SUM" },
      { type: "postback", title: "❓ Quiz Me", payload: "STUDY_QUIZ" },
      { type: "postback", title: "👶 Simplify", payload: "STUDY_ELI5" }
    ];
    return api.sendButton("🎓 **Study Mode Active**\nI've memorized your text. What should I do?", buttons, senderID);
  }

  if (payload && payload.startsWith("STUDY_")) {
    const saved = studyVault.get(senderID);
    if (!saved) return api.sendMessage("⚠️ Session expired. Please re-paste the text!", senderID);

    let prompt = "";
    if (payload === "STUDY_SUM") prompt = `Summarize this text in simple bullet points: ${saved}`;
    if (payload === "STUDY_QUIZ") prompt = `Generate a 3-question multiple choice quiz about this: ${saved}`;
    if (payload === "STUDY_ELI5") prompt = `Explain this like I'm 5 years old: ${saved}`;

    const ai = require("./ai.js");
    return await ai.run({ event, args: prompt.split(" ") });
  }

  api.sendMessage("🎓 Usage: `study <paste your notes here>`", senderID);
};
