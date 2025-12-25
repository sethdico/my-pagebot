const { http } = require("../../utils");
module.exports.config = { name: "webpilot", category: "AI", cooldown: 5 };
module.exports.run = async ({ event, args, api }) => {
    if (!args[0]) return api.sendMessage("🌐 Usage: webpilot <search>", event.sender.id);
    try {
        const res = await http.get("https://betadash-api-swordslush-production.up.railway.app/webpilot", { 
            params: { search: args.join(" ") } 
        });
        api.sendMessage(`🌐 **WebPilot**\n${res.data.response}`, event.sender.id);
    } catch (e) { api.sendMessage("❌ Webpilot error.", event.sender.id); }
};
