module.exports.config = {
    name: "screenshot",
    aliases: ["ss", "webshot"],
    author: "Sethdico",
    version: "1.1",
    category: "Utility",
    description: "Take a screenshot of any website.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api }) {
    let targetUrl = args.join("");
    if (!targetUrl) return api.sendMessage("📸 Usage: screenshot <url>", event.sender.id);

    try {
        if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
        const url = new URL(targetUrl);
        if (!['http:', 'https:'].includes(url.protocol)) return api.sendMessage("❌ invalid protocol", event.sender.id);
        targetUrl = url.href;
    } catch (e) {
        return api.sendMessage("❌ invalid URL", event.sender.id);
    }

    api.sendMessage(`📸 Capturing...`, event.sender.id);
    
    try {
        const screenshotUrl = `https://image.thum.io/get/width/1920/crop/1080/noanimate/${targetUrl}`;
        await api.sendAttachment("image", screenshotUrl, event.sender.id);
    } catch (e) {
        api.sendMessage("❌ Failed to capture.", event.sender.id);
    }
};
