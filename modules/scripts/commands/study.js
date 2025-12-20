const studyVault = new Map();

module.exports.config = {
  name: "study",
  author: "Sethdico",
  version: "2.5", // "No-Questions" Logic Update
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

  // --- STEP 1: CAPTURE DATA ---
  if (userInput && !payload) {
    studyVault.set(senderID, userInput);
    const buttons = [
      { type: "postback", title: "📝 Summarize", payload: "STUDY_SUM" },
      { type: "postback", title: "❓ Quiz Me", payload: "STUDY_QUIZ" },
      { type: "postback", title: "👶 Simplify", payload: "STUDY_ELI5" }
    ];
    
    // Shorten the display name if it's too long
    const displayName = userInput.length > 20 ? userInput.substring(0, 20) + "..." : userInput;
    
    return api.sendButton(`🎓 **Study Session: ${displayName}**\n\nI've memorized your notes. Click a button below and I will start immediately without asking any questions!`, buttons, senderID);
  }

  // --- STEP 2: EXECUTE ACTIONS (WITH NEGATIVE PROMPTING) ---
  if (payload && payload.startsWith("STUDY_")) {
    const saved = studyVault.get(senderID);
    if (!saved) return api.sendMessage("⚠️ **Session Expired.** Please re-paste your notes!", senderID);

    let prompt = "";
    
    // The "STRICT_EXECUTION" block prevents the AI from talking back
    const strictHeader = "[STRICT_EXECUTION_MODE]: DO NOT ask for clarification. DO NOT ask for preferences. DO NOT introduce yourself. EXECUTE the task immediately using the text provided below.\n\n";

    if (payload === "STUDY_SUM") {
        prompt = `${strictHeader}TASK: Summarize the text below into 5-8 clear bullet points.\n\nTEXT: ${saved}`;
    } 
    else if (payload === "STUDY_QUIZ") {
        prompt = `${strictHeader}TASK: Generate a 3-question Multiple Choice Quiz (A, B, C) based on the text below. Provide the questions NOW. Do not show answers.\n\nTEXT: ${saved}`;
    } 
    else if (payload === "STUDY_ELI5") {
        prompt = `${strictHeader}TASK: Explain the concept in the text below like I'm 5 years old using a simple analogy.\n\nTEXT: ${saved}`;
    }

    // Forward to AI
    try {
        const ai = require("./ai.js");
        // We overwrite the args so the AI only sees our 'Force-Command' prompt
        return await ai.run({ event, args: prompt.split(" ") });
    } catch (e) {
        api.sendMessage("❌ Connection to AI brain lost.", senderID);
    }
  }

  if (!userInput && !payload) {
    api.sendMessage("🎓 **Amdusbot Study Toolkit**\n\nType `study` followed by your notes to begin.", senderID);
  }
};
