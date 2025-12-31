const fs = require('fs').promises;
const path = require('path');

module.exports.config = {
    name: "clean", 
    author: "Sethdico", 
    category: "Admin", 
    adminOnly: true, 
    usePrefix: false
};

module.exports.run = async function ({ reply }) {
    try {
        const files = await fs.readdir(global.CACHE_PATH);
        const now = Date.now();
        let cleaned = 0;
        
        for (const file of files) {
            if (file === ".gitkeep") continue;
            const filePath = path.join(global.CACHE_PATH, file);
            try {
                const stats = await fs.stat(filePath);
                if (now - stats.mtimeMs > 3600000) { // 1 hour
                    await fs.unlink(filePath);
                    cleaned++;
                }
            } catch (e) {}
        }
        reply(`🧹 cleaned ${cleaned} old files`);
    } catch (e) { 
        reply("❌ cleanup failed"); 
    }
};
