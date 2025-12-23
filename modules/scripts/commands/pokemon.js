const axios = require("axios");

module.exports.config = {
  name: "pokemon",
  author: "Sethdico (Optimized)",
  version: "3.0-Robust",
  category: "Fun",
  description: "Get detailed pokemon info.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 3,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  let query = args[0]?.toLowerCase();
  const isShiny = args[1]?.toLowerCase() === "shiny";

  if (!query) return api.sendMessage("🔍 Usage: pokemon <name|id> [shiny]", senderID);
  if (query === "random") query = Math.floor(Math.random() * 1025) + 1;

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID).catch(() => {});

  try {
    // 1. MAIN FETCH
    const res = await axios.get(`https://pokeapi.co/api/v2/pokemon/${query}`, { timeout: 5000 });
    const data = res.data;

    // 2. DATA EXTRACTION
    const name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
    const types = data.types.map(t => t.type.name.toUpperCase()).join(" / ");
    const stats = {};
    data.stats.forEach(s => stats[s.stat.name] = s.base_stat);

    // 3. IMAGE SELECTION (High Res Priority)
    const officialArt = data.sprites.other["official-artwork"];
    const imgUrl = isShiny ? officialArt.front_shiny : officialArt.front_default;
    
    // 4. STAT BAR GENERATOR (Visual Improvement)
    const bar = (val) => "█".repeat(Math.min(10, Math.floor(val / 15))).padEnd(10, "░");

    const msg = `⚡ **${name}** #${data.id}
━━━━━━━━━━━━━━━━
🧬 **Type:** ${types}
📏 **H:** ${data.height/10}m  |  ⚖️ **W:** ${data.weight/10}kg

📊 **BASE STATS**
❤️ HP  : ${stats.hp} ${stats.hp > 100 ? "🔥" : ""}
⚔️ ATK : ${stats.attack}
🛡️ DEF : ${stats.defense}
💨 SPD : ${stats.speed}
━━━━━━━━━━━━━━━━`;

    // 5. SEND (Parallel execution)
    const sendImg = imgUrl ? api.sendAttachment("image", imgUrl, senderID) : Promise.resolve();
    const sendTxt = api.sendMessage(msg, senderID);

    await Promise.all([sendImg, sendTxt]);

  } catch (e) {
    if (e.response?.status === 404) {
      api.sendMessage(`❌ Pokémon "${query}" not found.`, senderID);
    } else {
      console.error(e.message);
      api.sendMessage("❌ PokéDex is currently offline.", senderID);
    }
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID).catch(() => {});
  }
};
