const { http } = require("../utils");
const MAX_POKEMON = 1025;

module.exports.config = {
  name: "pokemon", author: "Sethdico", version: "3.1", category: "Fun", description: "Pokedex info.", adminOnly: false, usePrefix: false, cooldown: 3,
};

module.exports.run = async ({ event, args, api }) => {
  const senderID = event.sender.id;
  let query = args[0]?.toLowerCase();
  
  if (!query) return api.sendMessage("⚡ Usage: pokemon <name/random>", senderID);
  if (query === "random") query = Math.floor(Math.random() * MAX_POKEMON) + 1;

  try {
    const res = await http.get(`https://pokeapi.co/api/v2/pokemon/${query}`);
    const data = res.data;
    const name = data.name.toUpperCase();
    const types = data.types.map(t => t.type.name).join("/");
    const img = data.sprites.other["official-artwork"].front_default;
    
    const s = {};
    (data.stats || []).forEach(st => s[st.stat.name] = st.base_stat);

    const msg = `⚡ **${name}** #${data.id}\n────────────────\n🧬 Type: ${types}\n\n📊 **STATS**\nHP: ${s.hp || 0} | ATK: ${s.attack || 0}\nDEF: ${s.defense || 0} | SPD: ${s.speed || 0}`;

    await api.sendMessage(msg, senderID);
    if (img) api.sendAttachment("image", img, senderID);
  } catch (e) {
    api.sendMessage("❌ Pokemon not found.", senderID);
  }
};
