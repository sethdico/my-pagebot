const { http } = require("../utils");

module.exports.config = {
    name: "wolfram", 
    author: "Sethdico", 
    version: "9.0", 
    category: "Utility", 
    description: "wolfram alpha", 
    adminOnly: false, 
    usePrefix: false, 
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    const id = event.sender.id;
    
    if (!input) return reply("usage: wolfram <query>");
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id).catch(()=>{});

    try {
        const res = await http.get(`https://api.wolframalpha.com/v2/query`, {
            params: { 
                appid: process.env.WOLFRAM_APP_ID, 
                input: input, 
                output: "json", 
                format: "plaintext,image" 
            },
            timeout: 60000
        });

        const data = res.data.queryresult;
        if (!data.success || data.error) return reply("wolfram couldn't solve that");

        // collect important results
        const importantPods = ["Result", "Solution", "Decimal approximation", "Value"];
        let results = [];
        let images = [];

        if (data.pods) {
            data.pods.forEach(pod => {
                const isImportant = importantPods.some(ip => pod.title.includes(ip));
                
                pod.subpods?.forEach(sub => {
                    if (sub.plaintext && isImportant) {
                        results.push(`${pod.title}\n${sub.plaintext}`);
                    }
                    
                    // grab plot/graph images
                    if (sub.img?.src && (pod.title.includes("Plot") || pod.title.includes("Graph"))) {
                        if (images.length < 2) images.push(sub.img.src);
                    }
                });
            });
        }

        // send results
        if (results.length > 0) {
            const msg = results.slice(0, 3).join("\n\n");
            await api.sendMessage(msg, id);
        } else {
            await api.sendMessage("no clear answer found", id);
        }

        // send images if any
        for (const img of images) {
            await api.sendAttachment("image", img, id).catch(()=>{});
        }

    } catch (e) {
        reply("wolfram unavailable");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id).catch(()=>{});
    }
};
