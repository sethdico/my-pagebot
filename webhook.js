const utils = require("./modules/utils");
const messageHandler = require("./page/main");

class SimpleLRU {
    constructor(limit) { this.limit = limit; this.cache = new Map(); }
    set(k, v) {
        if (this.cache.size >= this.limit) this.cache.delete(this.cache.keys().next().value);
        this.cache.set(k, v);
    }
    get(k) { return this.cache.get(k); }
}

const messagesCache = new SimpleLRU(500);

module.exports.listen = (event) => {
    if (!event || event.object !== "page") return;
    event.entry.forEach(entry => entry.messaging.forEach(async (ev) => {
        if (!ev.sender?.id || global.BANNED_USERS.has(ev.sender.id)) return;
        
        ev.type = await utils.getEventType(ev);
        
        // FIXED: Cache messages WITH full attachment data
        if (ev.message?.mid) {
            const cacheData = { 
                text: ev.message.text,
                attachments: ev.message.attachments ? ev.message.attachments.map(att => ({
                    type: att.type,
                    payload: att.payload // Store the full payload including URL
                })) : null
            };
            
            messagesCache.set(ev.message.mid, cacheData);
            
            // DEBUG: Log when image is cached
            if (cacheData.attachments?.some(a => a.type === "image")) {
                console.log(`📸 Cached image message ${ev.message.mid}:`, cacheData.attachments[0].payload?.url);
            }
            
            // AUTO-PROMPT: If image sent without text, trigger AI command immediately
            if (cacheData.attachments?.some(a => a.type === "image") && !cacheData.text) {
                console.log(`🤖 Auto-triggering AI for image-only message`);
                // This will be handled by the AI command's logic
            }
        }

        // FIXED: Restore attachments when replying
        if (ev.type === "message_reply") {
            console.log(`🔍 Reply detected! Looking for mid: ${ev.message.reply_to?.mid}`);
            const cached = messagesCache.get(ev.message.reply_to?.mid);
            if (cached) {
                ev.message.reply_to.text = cached.text;
                ev.message.reply_to.attachments = cached.attachments;
                
                // DEBUG: Log when retrieving cached image
                if (cached.attachments?.some(a => a.type === "image")) {
                    console.log(`📸 Retrieved cached image for reply:`, cached.attachments[0].payload?.url);
                    console.log(`📸 Full reply_to object:`, JSON.stringify(ev.message.reply_to, null, 2));
                }
            } else {
                // DEBUG: Log cache miss
                console.log(`⚠️ Cache miss for message ${ev.message.reply_to?.mid}`);
                console.log(`⚠️ Current cache keys:`, Array.from(messagesCache.cache.keys()));
            }
        }
        
        if (ev.message?.is_echo) return;
        utils.log(ev);
        
        setImmediate(() => messageHandler(ev));
    }));
};
