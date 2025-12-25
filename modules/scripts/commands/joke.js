const { http } = require("../../utils");

const BACKUP = [
  { s: "Why do Java devs wear glasses?", p: "Because they don't C#." },
  { s: "I used to play piano by ear.", p: "But now I use my hands." }
];

module.exports.config = {
  name: "joke",
  author: "Sethdico",
  version: "3.0-Fast",
  category: "Fun",
  description: "Random jokes.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 2,
};

module.exports.run = async ({ event, api }) => {
  try {
    // 2 second timeout then fail to backup
    const res = await http.get("https://official-joke-api.appspot.com/random_joke", { timeout: 2000 });
    const { setup, punchline } = res.data;
    api.sendMessage(`🤣 ${setup}\n\n👉 ${punchline}`, event.sender.id);
  } catch (e) {
    const joke = BACKUP[Math.floor(Math.random() * BACKUP.length)];
    api.sendMessage(`🤣 ${joke.s}\n\n👉 ${joke.p}`, event.sender.id);
  }
};
