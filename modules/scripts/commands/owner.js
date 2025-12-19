module.exports.config = {
  name: "owner",
  author: "Sethdico",
  version: "1.0",
  category: "Utility",
  description: "Contact the owner",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = function ({ event }) {
  // You can change the URL to your own Facebook profile
  const buttons = [
    {
      type: "web_url",
      url: "https://www.facebook.com/seth09asher", // CHANGE THIS TO YOUR LINK
      title: "Add Seth"
    },
    {
      type: "web_url",
      url: "https://github.com/sethdico",
      title: "GitHub"
    }
  ];

  api.sendButton(
    "👑 **Bot Owner**\n━━━━━━━━━━━━━━━━\nThis bot was created by Seth Asher Salinguhay.\nContact me for issues:",
    buttons,
    event.sender.id
  );
};
