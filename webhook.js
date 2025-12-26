const utils = require("./modules/utils");
const LRUCache = require('./modules/scripts/commands/lru-cache'); // Simple LRU implementation or below

// Simple custom LRU Cache to avoid external deps if needed
class SimpleLRU {
    constructor(limit) {
        this.limit = limit;
        this.cache = new Map();
    }
    set(key, value) {
        if (this.cache.size >= this.limit) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
    get(key) { return this.cache.get(key); }
    has(key) { return this.cache.has(key); }
}

const messagesCache = new SimpleLRU(500); // Reduced from 1000 to save RAM

module.exports.listen = (event) => {
    if (!event || event.object !== "page") return;

    event.entry.forEach((entry) => {
        entry.messaging.forEach(async (ev) => {
            if (!ev.sender?.id || global.BANNED_USERS.has(ev.sender.id)) return;

            ev.type = await utils.getEventType(ev);

            if (ev.message?.mid) {
                messagesCache.set(ev.message.mid, { 
                    text: ev.message.text, 
                    attachments: ev.message.attachments 
                });
            }

            if (ev.type === "message_reply") {
                const cached = messagesCache.get(ev.message.reply_to?.mid);
                if (cached) {
                    ev.message.reply_to.text = cached.text;
                    ev.message.reply_to.attachments = cached.attachments;
                }
            }

            if (ev.message?.is_echo) return;
            utils.log(ev);
            
            // Defer command execution
            setImmediate(() => require("./page/main")(ev));
        });
    });
};
