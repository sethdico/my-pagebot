const axios = require("axios");
const fs = require("fs");

const studyVault = new Map();

// CONFIG FOR THE SPECIALIZED STUDY API
const STUDY_CONFIG = {
  API_URL: "https://app.chipp.ai/api/v1/chat/completions",
  API_KEY: process.env.STUDY_API_KEY, // Pulls the new key from Render
  MODEL_ID: "newapplication-10034686", // Replace with your Study Model ID if different
  TIMEOUT: 120000
};

module.exports.config = {
  name: "study",
  author: "Sethdico",
  version: "5.0", 
  category: "Education",
  description: "Dedicated Academic Engine for Quizzes and Summaries.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, args }) {
  const senderID = event.sender.id;
  const userInput = args.join(" ").trim();
  const payload = event.postback?.payload;

  // 1. DATA INTAKE (Saving to Vault)
  if (userInput && !payload) {
    studyVault.set(senderID, userInput);
    const buttons = [
      { type: "postback", title: "📝 Summarize", payload: "STUDY_SUM" },
      { type: "postback", title: "❓ Quiz Me", payload: "STUDY_QUIZ" },
      { type: "postback", title: "👶 Simplify", payload: "STUDY_ELI5" }
    ];
    return api.sendButton("🎓 **Academic Engine Active**\nMaterial memorized. Select a processing mode:", buttons, senderID);
  }

  // 2. TASK EXECUTION (Direct API Call)
  if (payload && payload.startsWith("STUDY_")) {
    const material = studyVault.get(senderID);
    if (!material) return api.sendMessage("⚠️ Session expired. Please re-paste your notes!", senderID);

    let taskType = "";
    if (payload === "STUDY_SUM") taskType = "SUMMARIZE";
    if (payload === "STUDY_QUIZ") taskType = "QUIZ";
    if (payload === "STUDY_ELI5") taskType = "SIMPLIFY (ELI5)";

    api.sendTypingIndicator(true, senderID);

    try {
        // THE MASTER SYSTEM PROMPT
        const systemPrompt = `[ROLE]: Act as the Amdusbot Academic Engine. You are a task-oriented, high-precision processing unit.
[PRIMARY DIRECTIVE]: Process the provided MATERIAL and output the requested TASK with zero conversational filler. Do not say "Hi" or "I can help".
[EXECUTION MODES]:
1. SUMMARIZE: 5-8 bullet points. Terminology in **Bold**.
2. QUIZ: 3 Multiple Choice Questions (A, B, C, D). Questions only.
3. SIMPLIFY: Use a simple analogy/story for a child.
[STRICT CONSTRAINTS]: Use ONLY the MATERIAL provided. Start response immediately with the result.
MATERIAL: ${material}
TASK: ${taskType}`;

        const response = await axios.post(STUDY_CONFIG.API_URL, {
            model: STUDY_CONFIG.MODEL_ID,
            messages: [{ role: "user", content: systemPrompt }],
            stream: false
        }, {
            headers: { "Authorization": `Bearer ${STUDY_CONFIG.API_KEY}` },
            timeout: STUDY_CONFIG.TIMEOUT
        });

        const result = response.data?.choices?.[0]?.message?.content;
        
        if (result) {
            // Send the raw result immediately (because the prompt forces no filler)
            await api.sendMessage(result, senderID);
        }

    } catch (e) {
        console.error("Study API Error:", e.message);
        api.sendMessage("❌ Academic Engine Error: Check your API Key or Network.", senderID);
    } finally {
        api.sendTypingIndicator(false, senderID);
    }
  }
};
