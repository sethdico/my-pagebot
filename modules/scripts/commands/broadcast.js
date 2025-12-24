const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../../../config.json");

// === CONFIGURATION ===
const QUEUE_FILE = path.join(__dirname, "broadcast_queue.json");
const OPT_OUT_FILE = path.join(__dirname, "broadcast_optouts.json");

// 🟢 SAFE SETTINGS
const BATCH_SIZE = 5;          // Messages per batch
const MIN_INTERVAL = 10;       // Minimum minutes between batches
const MAX_INTERVAL = 20;       // Maximum minutes (randomized)

let isBroadcasting = false;

module.exports.config = {
    name: "broadcast",
    aliases: ["announce", "bc"],
    author: "Sethdico",
    version: "3.0",
    category: "Admin",
    description: "Safely sends a message to users active within the last 23 hours.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = async function ({ event, args, api }) {
    const senderID = event.sender.id;
    const adminList = config.ADMINS || config.ADMIN || [];
    
    // 1. Permission Check
    if (!adminList.includes(senderID)) return; 

    const subCommand = args[0]?.toLowerCase();
    const messageRaw = args.slice(1).join(" ");

    // --- STOP ---
    if (subCommand === "stop") {
        if (fs.existsSync(QUEUE_FILE)) fs.unlinkSync(QUEUE_FILE);
        isBroadcasting = false;
        return api.sendMessage("🛑 Broadcast stopped.", senderID);
    }

    // --- UNSUBSCRIBE HANDLING (Hidden) ---
    if (subCommand === "unsubscribe_action") {
        let optOuts = [];
        if (fs.existsSync(OPT_OUT_FILE)) optOuts = JSON.parse(fs.readFileSync(OPT_OUT_FILE));
        if (!optOuts.includes(senderID)) {
            optOuts.push(senderID);
            fs.writeFileSync(OPT_OUT_FILE, JSON.stringify(optOuts));
        }
        return api.sendMessage("🔕 You have been removed from announcements.", senderID);
    }

    if (!messageRaw) return api.sendMessage("Usage: broadcast <message>", senderID);
    if (isBroadcasting) return api.sendMessage("⚠️ Broadcast is already running.", senderID);

    api.sendMessage("🛡️ Fetching active users...", senderID);

    try {
        // 1. Fetch Users
        const allUsers = await fetchAllUsers(api);

        // 2. Load Opt-Outs
        let optOuts = [];
        if (fs.existsSync(OPT_OUT_FILE)) optOuts = JSON.parse(fs.readFileSync(OPT_OUT_FILE));

        // 3. APPLY 23-HOUR FILTER
        const now = Date.now();
        const safeWindow = 23 * 60 * 60 * 1000; // 23 Hours

        const validIDs = allUsers
            .filter(u => {
                const lastActive = new Date(u.updated_time).getTime();
                const isRecent = (now - lastActive) < safeWindow;
                const isOptedOut = optOuts.includes(u.id);
                return isRecent && !isOptedOut;
            })
            .map(u => u.id);

        if (validIDs.length === 0) {
            return api.sendMessage("🛡️ No users found active in the last 23 hours.", senderID);
        }

        // 4. Save Queue
        const queueData = {
            message: messageRaw,
            ids: validIDs,
            total: validIDs.length,
            sent: 0
        };
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(queueData));

        api.sendMessage(
            `✅ **Broadcast Started**\n` +
            `👥 Active Users: ${validIDs.length}\n` +
            `⏱️ Rate: 5 users every ${MIN_INTERVAL}-${MAX_INTERVAL} mins`, 
            senderID
        );

        processSafeQueue(api, senderID);

    } catch (e) {
        api.sendMessage(`❌ Error: ${e.message}`, senderID);
    }
};

// ==========================================
// 🛠️ INTERNAL FUNCTIONS
// ==========================================

async function fetchAllUsers(api) {
    let allUsers = [];
    let url = `https://graph.facebook.com/v21.0/me/conversations?fields=participants,updated_time&limit=100&access_token=${global.PAGE_ACCESS_TOKEN}`;
    
    let pages = 0;
    while (url && pages < 10) { 
        try {
            const res = await axios.get(url);
            res.data.data.forEach(c => {
                if (c.participants?.data[0]) {
                    allUsers.push({ id: c.participants.data[0].id, updated_time: c.updated_time });
                }
            });
            url = res.data.paging?.next;
            pages++;
        } catch (e) { break; }
    }
    return allUsers;
}

function processSafeQueue(api, adminID) {
    if (!fs.existsSync(QUEUE_FILE)) return;
    isBroadcasting = true;

    const queue = JSON.parse(fs.readFileSync(QUEUE_FILE));
    const batch = queue.ids.splice(0, BATCH_SIZE);

    batch.forEach(async (id) => {
        try {
            // Anti-Spam: Random Greeting
            const greetings = ["Hi", "Hello", "Hey", "Updates", "Notice"];
            const randomGreet = greetings[Math.floor(Math.random() * greetings.length)];
            
            const finalMsg = `📢 **${randomGreet}!**\n${queue.message}`;
            
            const buttons = [{
                type: "postback",
                title: "🔕 Unsubscribe",
                payload: "broadcast unsubscribe_action" 
            }];

            await api.sendButton(finalMsg, buttons, id);
            queue.sent++;
        } catch (e) { /* Ignore */ }
    });

    if (queue.ids.length > 0) {
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue));
        
        // Random Interval
        const minMs = MIN_INTERVAL * 60 * 1000;
        const maxMs = MAX_INTERVAL * 60 * 1000;
        const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);

        setTimeout(() => processSafeQueue(api, adminID), randomDelay);
    } else {
        fs.unlinkSync(QUEUE_FILE);
        isBroadcasting = false;
        api.sendMessage(`✅ Broadcast Complete. Sent to ${queue.sent} users.`, adminID);
    }
}
