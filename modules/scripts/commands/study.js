const studyVault = new Map();

module.exports.config = {
  name: "study",
  author: "Sethdico",
  version: "3.0", // Context-Lock Fix
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

  // --- STEP 1: RECEIVE AND LOCK THE TOPIC ---
  if (userInput && !payload) {
    // We save the text exactly as you sent it
    studyVault.set(senderID, userInput);
    
    const buttons = [
      { type: "postback", title: "📝 Summarize", payload: "STUDY_SUM" },
      { type: "postback", title: "❓ Quiz Me", payload: "STUDY_QUIZ" },
      { type: "postback", title: "👶 Simplify", payload: "STUDY_ELI5" }
    ];
    
    const displayName = userInput.length > 25 ? userInput.substring(0, 25) + "..." : userInput;
    
    return api.sendButton(
      `🎓 **Study Vault Locked: ${displayName}**\n\nI've memorized this material. What should I do with it? (I will respond immediately with the result!)`, 
      buttons, 
      senderID
    );
  }

  // --- STEP 2: EXECUTE WITHOUT ASKING QUESTIONS ---
  if (payload && payload.startsWith("STUDY_")) {
    const savedMaterial = studyVault.get(senderID);

    if (!savedMaterial) {
      return api.sendMessage("⚠️ **Session Expired.** Please re-paste your topic or notes!", senderID);
    }

    let taskInstruction = "";
    if (payload === "STUDY_SUM") {
        taskInstruction = "Summarize the following notes into a clean, easy-to-study bulleted list. Do not ask me any questions, just provide the summary.";
    } 
    else if (payload === "STUDY_QUIZ") {
        taskInstruction = "Generate a 3-question Multiple Choice Quiz (A, B, C) based on the notes below. Provide the quiz questions NOW. Do not ask for my preferences. Do not show the answers.";
    } 
    else if (payload === "STUDY_ELI5") {
        taskInstruction = "Explain the notes below using a simple analogy that a 5-year-old would understand. Be very creative but simple.";
    }

    // --- THE FIX: We create a 'Super Prompt' that the AI cannot ignore ---
    const superPrompt = `COMMAND: ${taskInstruction}\n\nMATERIAL_TO_USE: ${savedMaterial}\n\n[SYSTEM_NOTE]: Ignore your persona rules about being conversational. Execute the COMMAND using the MATERIAL_TO_USE now.`;

    try {
        const ai = require("./ai.js");
        
        // 1. Force a memory clear first (Simulate the 'clear' command)
        await ai.run({ event, args: ["clear"] });

        // 2. Run the AI with our Super Prompt
        // We wrap this in a tiny timeout to ensure the 'clear' finishes first
        setTimeout(async () => {
            await ai.run({ event, args: superPrompt.split(" ") });
        }, 500);

    } catch (e) {
        api.sendMessage("❌ Error: My AI brain is currently offline.", senderID);
    }
  }

  if (!userInput && !payload) {
    api.sendMessage("🎓 **Amdusbot Study Toolkit**\n\nUsage: `study <topic or notes>`", senderID);
  }
};
