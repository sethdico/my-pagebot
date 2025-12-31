const mongoose = require('mongoose');
const logger = require('../utils/logger');
const CONSTANTS = require('../../config/constants');

const uri = process.env.MONGODB_URI;

if (uri) {
    mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    })
    .then(() => logger.info('connected to mongodb'))
    .catch(err => logger.error('mongodb connection failed:', err.message));
    
    // auto reconnect
    mongoose.connection.on('disconnected', () => {
        logger.warn('mongodb disconnected, attempting reconnect');
        setTimeout(() => mongoose.connect(uri).catch(() => {}), 5000);
    });
}

// schemas
const UserStatsSchema = new mongoose.Schema({
    userId: { type: String, unique: true, index: true },
    name: String,
    firstName: String,
    lastName: String,
    profilePic: String,
    gender: String,
    birthday: String,
    link: String,
    locale: String,
    timezone: Number,
    count: { type: Number, default: 0 },
    firstSeen: { type: Date, default: Date.now },
    lastSynced: { type: Date, default: 0 },
    lastActive: { type: Date, default: Date.now, index: true }
});

UserStatsSchema.index({ userId: 1, lastActive: -1 });

const BanSchema = new mongoose.Schema({
    userId: { type: String, unique: true, index: true },
    reason: String,
    bannedAt: { type: Date, default: Date.now }
});

const ReminderSchema = new mongoose.Schema({
    id: String,
    userId: String,
    message: String,
    fireAt: { type: Date, expires: 0 }
});

const SettingSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: String
});

const StatSchema = new mongoose.Schema({
    command: { type: String, unique: true },
    count: { type: Number, default: 0 }
});

const CommandLogSchema = new mongoose.Schema({
    userId: String,
    command: String,
    timestamp: { type: Date, default: Date.now, expires: CONSTANTS.THREE_DAYS }
});

// models
const Ban = mongoose.model('Ban', BanSchema);
const Reminder = mongoose.model('Reminder', ReminderSchema);
const Setting = mongoose.model('Setting', SettingSchema);
const Stat = mongoose.model('Stat', StatSchema);
const UserStat = mongoose.model('UserStat', UserStatsSchema);
const CommandLog = mongoose.model('CommandLog', CommandLogSchema);

// database operations
const db = {
    // bans
    addBan: (id, reason = "no reason") => Ban.create({ userId: id, reason }).catch(() => {}),
    
    removeBan: (id) => Ban.deleteOne({ userId: id }),
    
    loadBansIntoMemory: async (cb) => {
        try {
            const rows = await Ban.find({});
            cb(new Set(rows.map(r => r.userId)));
        } catch (e) {
            logger.error('failed to load bans:', e.message);
            cb(new Set());
        }
    },
    
    // reminders
    addReminder: (r) => Reminder.create({ ...r, fireAt: new Date(r.fireAt) }),
    
    deleteReminder: (id) => Reminder.deleteOne({ id }),
    
    getActiveReminders: async (cb) => {
        try {
            const rows = await Reminder.find({ fireAt: { $gt: new Date() } });
            cb(rows);
        } catch (e) {
            logger.error('failed to get reminders:', e.message);
            cb([]);
        }
    },
    
    // settings
    setSetting: (key, val) => Setting.findOneAndUpdate(
        { key }, 
        { value: val }, 
        { upsert: true }
    ),
    
    getSetting: async (key) => {
        try {
            const row = await Setting.findOne({ key });
            return row ? row.value : null;
        } catch (e) {
            return null;
        }
    },
    
    // stats
    trackCommandUsage: async (name) => {
        try {
            await Stat.findOneAndUpdate(
                { command: name }, 
                { $inc: { count: 1 } }, 
                { upsert: true }
            );
        } catch (e) {
            // fail silently
        }
    },
    
    trackUserCommand: async (userId, command) => {
        try {
            await CommandLog.create({ userId, command });
        } catch (e) {
            // fail silently
        }
    },
    
    // users
    syncUser: async (userId, fbData = null) => {
        try {
            const update = { lastActive: new Date(), $inc: { count: 1 } };
            
            if (fbData) {
                Object.assign(update, fbData, { lastSynced: new Date() });
            }
            
            return await UserStat.findOneAndUpdate(
                { userId }, 
                update, 
                { upsert: true, new: true }
            );
        } catch (e) {
            logger.error('user sync failed:', e.message);
            return null;
        }
    },
    
    getUserData: (userId) => UserStat.findOne({ userId }),
    
    getAllUsers: async () => {
        try {
            const cutoff = new Date(Date.now() - CONSTANTS.THREE_DAYS);
            // FIXED: Added .lean() to make sure we get plain objects
            return await UserStat.find({ lastActive: { $gte: cutoff } })
                .sort({ lastActive: -1 })
                .lean();
        } catch (e) {
            logger.error('failed to get users:', e.message);
            return [];
        }
    },
    
    purgeInactiveUsers: async () => {
        try {
            const cutoff = new Date(Date.now() - CONSTANTS.THREE_DAYS);
            const result = await UserStat.deleteMany({ lastActive: { $lt: cutoff } });
            if (result.deletedCount > 0) {
                logger.info(`purged ${result.deletedCount} inactive users`);
            }
        } catch (e) {
            logger.error('purge failed:', e.message);
        }
    },
    
    getStats: () => Stat.find({}).sort({ count: -1 }).limit(10),
    
    getUserCommandHistory: async (userId, limit = 10) => {
        try {
            return await CommandLog.find({ userId })
                .sort({ timestamp: -1 })
                .limit(limit);
        } catch (e) {
            return [];
        }
    },
    
    // expose models
    UserStat,
    Ban,
    Reminder,
    Setting,
    Stat,
    CommandLog
};

module.exports = db;
