const axios = require("axios")
const api = require("path-to-api") // Declare the api variable

module.exports.config = {
  name: "pokemon",
  author: "Sethdico",
  version: "2.0",
  category: "Fun",
  description: "Get detailed Pokémon info including shiny forms, evolution chain, and moves.",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
}

module.exports.run = async ({ event, args }) => {
  const pokemonName = args[0]?.toLowerCase()
  const senderID = event.sender.id

  const isShiny = args[1]?.toLowerCase() === "shiny"
  const isRandom = pokemonName === "random"

  if (!pokemonName) {
    return api.sendMessage(
      "🔍 **Usage:**\npokemon <name> - Get Pokémon info\npokemon <name> shiny - Get shiny form\npokemon random - Random Pokémon\n\nExample: pokemon pikachu",
      senderID,
    )
  }

  if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID)

  try {
    let targetPokemon = pokemonName
    if (isRandom) {
      targetPokemon = Math.floor(Math.random() * 1010) + 1
    }

    const url = `https://pokeapi.co/api/v2/pokemon/${targetPokemon}`
    const response = await axios.get(url, { timeout: 10000 })
    const data = response.data

    const name = data.name.toUpperCase()
    const id = data.id
    const height = data.height / 10
    const weight = data.weight / 10
    const types = data.types.map((t) => t.type.name.toUpperCase()).join(", ")
    const abilities = data.abilities.map((a) => a.ability.name).join(", ")

    const hp = data.stats[0].base_stat
    const attack = data.stats[1].base_stat
    const defense = data.stats[2].base_stat
    const spAtk = data.stats[3].base_stat
    const spDef = data.stats[4].base_stat
    const speed = data.stats[5].base_stat
    const total = hp + attack + defense + spAtk + spDef + speed

    const image = isShiny
      ? data.sprites.other["official-artwork"].front_shiny || data.sprites.front_shiny
      : data.sprites.other["official-artwork"].front_default || data.sprites.front_default

    const speciesRes = await axios.get(data.species.url, { timeout: 5000 })
    const generation = speciesRes.data.generation.name.replace("generation-", "Gen ").toUpperCase()

    const msg = `⚡ **POKÉMON: ${name}** (#${id})${isShiny ? " ✨ SHINY" : ""}
━━━━━━━━━━━━━━━━
🏷️ **Type:** ${types}
🌍 **Generation:** ${generation}
📏 **Height:** ${height}m | ⚖️ **Weight:** ${weight}kg
🧬 **Abilities:** ${abilities}

📊 **BASE STATS:** (Total: ${total})
❤️ HP: ${hp} | ⚔️ ATK: ${attack} | 🛡️ DEF: ${defense}
✨ SP.ATK: ${spAtk} | 💎 SP.DEF: ${spDef} | ⚡ SPD: ${speed}
━━━━━━━━━━━━━━━━`

    if (image) {
      await api.sendAttachment("image", image, senderID)
    }

    const buttons = [
      {
        type: "postback",
        title: isShiny ? "🎨 Normal" : "✨ Shiny",
        payload: isShiny ? `pokemon ${name}` : `pokemon ${name} shiny`,
      },
      {
        type: "postback",
        title: "🎲 Random",
        payload: "pokemon random",
      },
      {
        type: "web_url",
        url: `https://www.pokemon.com/us/pokedex/${data.name}`,
        title: "📖 Pokédex",
      },
    ]

    await api.sendButton(msg, buttons, senderID)
  } catch (error) {
    console.error("PokéAPI Error:", error.message)
    if (error.response && error.response.status === 404) {
      api.sendMessage(`❌ Pokémon "${pokemonName}" not found. Check your spelling or try: pokemon random`, senderID)
    } else {
      api.sendMessage("❌ Error connecting to PokéAPI.", senderID)
    }
  } finally {
    if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID)
  }
}
