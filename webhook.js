const utils = require("./modules/utils");
const messageHandler = require("./page/main");

class MessageCache {
    constructor(maxSize) { 
        this.maxSize = maxSize; 
        this.cache = new Map(); 
    }

    set(key, value) {
        // if cache is full, delete the oldest item
        if (this.cache.size >= this.maxSize) {
            this.cache.delete(this.cache.keys().next().value);
        }
        // store with timestamp
        this.cache.set(key, { ...value, timestamp: Date.now() });
    }

    get(key) { 
        return this.cache.get(key); 
    }
}

const messagesCache = new MessageCache(500);

module.exports.listen = (event) => {
    if (!event || event.object !== "page") return;
    
    event.entry.forEach(entry => entry.messaging.forEach(async (ev) => {
        if (!ev.sender?.id || global.BANNED_USERS.has(ev.sender.id)) return;
        
        ev.type = await utils.getEventType(ev);
        
        // cache messages so we can handle replies later
        if (ev.message?.mid) {
            const cacheData = { 
                text: ev.message.text,
                attachments: ev.message.attachments ? ev.message.attachments.map(att => ({
                    type: att.type,
                    payload: att.payload 
                })) : null
            };
            
            messagesCache.set(ev.message.mid, cacheData);
            
            // log when we cache an image
            if (cacheData.attachments?.some(a => a.type === "image")) {
                global.log.debug(`cached image ${ev.message.mid}:`, cacheData.attachments[0].payload?.url);
            }
        }

        // restore attachments if user is replying to a message
        if (ev.type === "message_reply") {
            const cached = messagesCache.get(ev.message.reply_to?.mid);
            if (cached) {
                ev.message.reply_to.text = cached.text;
                ev.message.reply_to.attachments = cached.attachments;
                
                if (cached.attachments?.some(a => a.type === "image")) {
                    global.log.debug(`retrieved cached image for reply`);
                }
            } else {
                global.log.debug(`cache miss for message ${ev.message.reply_to?.mid}`);
            }
        }
        
        if (ev.message?.is_echo) return;
        utils.log(ev);
        
        setImmediate(() => messageHandler(ev));
    }));
};
