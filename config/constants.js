module.exports = {
    // Time constants
    ONE_HOUR: 3600000,
    ONE_DAY: 86400000,
    THREE_DAYS: 259200000,
    SIX_HOURS: 21600000,
    
    // Limits
    MAX_SESSIONS: 500,
    MAX_CACHE_SIZE: 500,
    MAX_COOLDOWN_ENTRIES: 1000,
    MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
    MAX_MESSAGE_LENGTH: 1900,
    MAX_SYNC_LOCKS: 100,
    
    // Rate limits
    REQUESTS_PER_MINUTE: 100,
    BROADCAST_BATCH_SIZE: 50,
    BROADCAST_BATCH_DELAY: 2000,
    
    // Retry config
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    
    // File types
    ALLOWED_FILE_TYPES: ['.pdf', '.docx', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.mp4', '.mp3', '.zip'],
    
    // Cleanup intervals
    CLEANUP_INTERVAL: 300000, // 5 min
    CACHE_CLEANUP_INTERVAL: 600000, // 10 min
};
