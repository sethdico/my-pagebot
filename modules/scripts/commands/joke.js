const axios = require("axios");
module.exports.config = {
  name: "pokemon",
  author: "Sethdico",
  version: "1.3",
  category: "Fun",
  description: "Get stats and images of a Pokémon.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};
module.exports.run = async function ({ event, args }) {
  const pokemonName = args[0]?.toLowerCase();
  const senderID = event.sender.id;
  if (!pokemonName) {
    return api.sendMessage("🔍 Please provide a Pokémon name.\nExample: pokemon pikachu", senderID);
  }
  api.sendTypingIndicator(true, senderID);
  try {
    const url = `https:                                            
    const response = await axios.get(url);
    const data = response.data;
                   
    const name = data.name.toUpperCase();
    const id = data.id;
    const height = data.height / 10;                     
    const weight = data.weight / 10;                 
    const types = data.types.map(t => t.type.name.toUpperCase()).join(", ");
    const abilities = data.abilities.map(a => a.ability.name).join(", ");
            
    const hp = data.stats[0].base_stat;
    const attack = data.stats[1].base_stat;
    const defense = data.stats[2].base_stat;
    const speed = data.stats[5].base_stat;
                                                              
    const image = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
    const msg = `//pokeapi.co/api/v2/pokemon/${pokemonName}`;
    const response = await axios.get(url);
    const data = response.data;
    // Extract Data
    const name = data.name.toUpperCase();
    const id = data.id;
    const height = data.height / 10; // Convert to meters
    const weight = data.weight / 10; // Convert to kg
    const types = data.types.map(t => t.type.name.toUpperCase()).join(", ");
    const abilities = data.abilities.map(a => a.ability.name).join(", ");
    // Stats
    const hp = data.stats[0].base_stat;
    const attack = data.stats[1].base_stat;
    const defense = data.stats[2].base_stat;
    const speed = data.stats[5].base_stat;
    // Image (Official Artwork is higher quality than sprites)
    const image = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
    const msg = `⚡ **POKÉMON: ${name}** (#${id}) ━━━━━━━━━━━━━━━━ 🏷️ **Type:** ${types} 📏 **Height:** ${height}m ⚖️ **Weight:** ${weight}kg 🧬 **Abilities:** ${abilities} 📊 **BASE STATS:** • HP: ${hp} • ATK: ${attack} • DEF: ${defense} • SPD: ${speed} ━━━━━━━━━━━━━━━━`;
                       
    if (image) {
      await api.sendAttachment("image", image, senderID);
    }
                                             
    const buttons = [
      { type: "web_url", url: `// Send Image first
    if (image) {
      await api.sendAttachment("image", image, senderID);
    }
    // Send Stats with a button for more info
    const buttons = [
      { type: "web_url", url: `https://www.pokemon.com/us/pokedex/${pokemonName}`, title: "📖 View Pokedex" }
    ];
    await api.sendButton(msg, buttons, senderID);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      api.sendMessage(`❌ Pokémon "${pokemonName}" not found. Check your spelling!`, senderID);
    } else {
      api.sendMessage("❌ Error connecting to PokéAPI.", senderID);
    }
  } finally {
    api.sendTypingIndicator(false, senderID);
  }
};
