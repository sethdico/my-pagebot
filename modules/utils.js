const axios = require("axios");
const https = require("https");

// create a shared connection that stays open
// this makes the bot much faster because it doesn't handshake every time
const http = axios.create({
    timeout: 20000, // 20s timeout
    httpsAgent: new https.Agent({ keepAlive: true }),
    headers: { 'User-Agent': 'Amduspage/Bot' }
});

function getEventType(event) {
    // 1. Check for Button Clicks (Postbacks)
    // We treat these as text commands so the bot knows to read the payload
    if (event.postback) {
        // Create a fake message structure so commands can read .text easily
        event.message = { text: event.postback.payload }; 
        return "message";
    }

    // 2. Check for Messages
    if (event.message) {
        // If it has attachments (images, files), it's an attachment event
        if (event.message.attachments && event.message.attachments.length > 0) {
            // But if it ALSO has text, it's a message WITH an image (like "ai describe this")
            if (event.message.text) return "message";
            return "attachment";
        }
        
        // If it's a reply to another message
        if (event.message.reply_to) return "reply";

        // Standard text message
        if (event.message.text) return "message";
        
        // Stickers or other non-text things
        return "unknown";
    }

    return "unknown";
}

function log(event) {
    // Don't log the bot's own echoes or delivery receipts
    if (event.message?.is_echo || event.delivery) return;

    const senderId = event.sender?.id || "Unknown";
    // Check if admin
    const senderType = global.ADMINS.has(senderId) ? "ADMIN" : "USER";
    
    // Clean log output
    const msgContent = event.message?.text || event.postback?.payload || "[Attachment/Media]";
    console.log(`[${senderType}] (${senderId}): ${msgContent}`);
}

module.exports = { http, log, getEventType };
