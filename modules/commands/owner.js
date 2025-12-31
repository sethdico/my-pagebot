module.exports.config = {
  name: "owner", author: "Sethdico", version: "1.2", category: "Utility", description: "Contact the owner", adminOnly: false, usePrefix: false, cooldown: 5,
};

module.exports.run = async function ({ event, api, reply }) {
  const buttons = [
    { type: "web_url", url: "https://www.facebook.com/seth09asher", title: "Add Seth" },
    { type: "web_url", url: "https://github.com/sethdico", title: "GitHub" }
  ];
  try {
      await api.sendButton("👑 **Bot Owner**\nCreated by Seth Asher Salinguhay.", buttons, event.sender.id);
  } catch (e) {
      reply("👑 **Owner:** Seth Asher Salinguhay\nFB: facebook.com/seth09asher");
  }
};
