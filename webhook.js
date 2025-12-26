const utils = require("./modules/utils");
const messageHandler = require("./page/main"); // FIX: Require once at top

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
        
        if (ev.message?.mid) messagesCache.set(ev.message.mid, { 
            text: ev.message.text, 
            attachments: ev.message.attachments 
        });

        if (ev.type === "message_reply") {
            const cached = messagesCache.get(ev.message.reply_to?.mid);
            if (cached) {
                ev.message.reply_to.text = cached.text;
                ev.message.reply_to.attachments = cached.attachments;
            }
        }
        if (ev.message?.is_echo) return;
        utils.log(ev);
        
        // FIX: Use the pre-loaded handler
        setImmediate(() => messageHandler(ev));
    }));
};
