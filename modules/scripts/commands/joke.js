const axios = require("axios");

// === LOCAL BACKUP JOKES (Instant Fallback) ===
const BACKUP_JOKES = [
  { setup: "Why do programmers prefer dark mode?", punchline: "Because light attracts bugs." },
  { setup: "How many programmers does it take to change a light bulb?", punchline: "None, that's a hardware problem." },
  { setup: "What is a ghost's favorite data type?", punchline: "Boolean." },
  { setup: "Why was the JavaScript developer sad?", punchline: "Because he didn't know how to 'null' his feelings." },
  { setup: "I told my wife she was drawing her eyebrows too high.", punchline: "She looked surprised." }
];

module.exports.config = {
  name: "joke",
  author: "Sethdico (Optimized)",
  version: "3.0-Failover",
  category: "Fun",
  description: "Jokes command",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  const category = args[0]?.toLowerCase();

  if (category === "list") {
    return api.sendMessage("😂 Categories: dad, programming, dark, pun", senderID);
  }

  // Fire and forget
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(() => {});

  // HELPER: Pick random local joke
  const sendBackup = () => {
    const joke = BACKUP_JOKES[Math.floor(Math.random() * BACKUP_JOKES.length)];
    api.sendMessage(`⚡ **Joke (Offline Mode)**\n\n${joke.setup}\n\n👉 ${joke.punchline}`, senderID);
  };

  try {
    let url = "https://official-joke-api.appspot.com/random_joke";
    if (category === "programming") url = "https://official-joke-api.appspot.com/jokes/programming/random";
    if (category === "dad") url = "https://icanhazdadjoke.com/";

    const headers = { Accept: "application/json" };

    // ⚡ SPEED OPTIMIZATION: Timeout after 2.5 seconds and swap to backup
    const apiCall = axios.get(url, { headers, timeout: 2500 });
    
    // Create a promise that rejects after 2.5s to trigger backup
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500));

    const res = await Promise.race([apiCall, timeoutPromise]);

    let setup, punchline;

    if (category === "dad") {
      setup = res.data.joke;
      punchline = ""; // Dad jokes are one-liners
    } else if (Array.isArray(res.data)) {
      setup = res.data[0].setup;
      punchline = res.data[0].punchline;
    } else {
      setup = res.data.setup;
      punchline = res.data.punchline;
    }

    const msg = punchline 
      ? `🤣 **Joke Time**\n\n${setup}\n\n👉 ${punchline}`
      : `👨 **Dad Joke**\n\n${setup}`;
      
    await api.sendMessage(msg, senderID);

  } catch (e) {
    console.log("Joke API failed/slow, using backup.");
    sendBackup();
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(() => {});
  }
};
