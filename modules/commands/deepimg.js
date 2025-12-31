const { http } = require("../../utils");
const API_URLS = require("../../../config/apis");
const drawQueue = new Map();

module.exports.config = {
    name: "deepimg", aliases: ["draw"], author: "Sethdico", version: "2.1", category: "Fun", description: "AI Image Generator", adminOnly: false, usePrefix: false, cooldown: 15,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    if (drawQueue.has(senderID)) return reply("⏳ you already have a drawing in progress");
    
    let style = "anime";
    let prompt = args.join(" ");
    
    if (args[0]?.startsWith("--")) {
        const requestedStyle = args[0].slice(2).toLowerCase();
        if (["anime", "realistic", "cartoon", "sketch"].includes(requestedStyle)) {
            style = requestedStyle;
            prompt = args.slice(1).join(" ");
        }
    }
    
    if (!prompt) return reply("🎨 Usage: draw [--style] <prompt>\nStyles: anime, realistic, cartoon, sketch");
    
    drawQueue.set(senderID, true);
    reply("🎨 painting your request...");

    try {
        const res = await http.get(API_URLS.deepimg, { params: { prompt: prompt, style: style, size: "3:2" }, timeout: 90000 });
        if (res.data.url) await api.sendAttachment("image", res.data.url, event.sender.id);
        else throw new Error("No image URL");
    } catch (e) {
        reply("❌ failed to generate image");
    } finally {
        drawQueue.delete(senderID);
    }
};
