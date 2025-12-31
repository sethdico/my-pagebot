const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (uri) {
    mongoose.connect(uri)
        .then(() => console.log("🟢 connected to mongodb atlas."))
        .catch(err => console.error("🔴 mongodb error:", err.message));
}

// EXPANDED SCHEMA
const UserStatsSchema = new mongoose.Schema({ 
    userId: { type: String, unique: true }, 
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
    lastActive: { type: Date, default: Date.now } // Tracks activity for the 3-day rule
});

const Ban = mongoose.model('Ban', new mongoose.Schema({ userId: { type: String, unique: true } }));
const Reminder = mongoose.model('Reminder', new mongoose.Schema({ id: String, userId: String, message: String, fireAt: { type: Date, expires: 0 } }));
const Setting = mongoose.model('Setting', new mongoose.Schema({ key: { type: String, unique: true }, value: String }));
const Stat = mongoose.model('Stat', new mongoose.Schema({ command: { type: String, unique: true }, count: { type: Number, default: 0 } }));
const UserStat = mongoose.model('UserStat', UserStatsSchema);

module.exports = {
    addBan: (id) => Ban.create({ userId: id }).catch(() => {}),
    removeBan: (id) => Ban.deleteOne({ userId: id }),
    loadBansIntoMemory: async (cb) => {
        const rows = await Ban.find({});
        cb(new Set(rows.map(r => r.userId)));
    },
    addReminder: (r) => Reminder.create({ ...r, fireAt: new Date(r.fireAt) }),
    deleteReminder: (id) => Reminder.deleteOne({ id }),
    getActiveReminders: async (cb) => {
        const rows = await Reminder.find({ fireAt: { $gt: new Date() } });
        cb(rows);
    },
    setSetting: (key, val) => Setting.findOneAndUpdate({ key }, { value: val }, { upsert: true }),
    getSetting: async (key) => {
        const row = await Setting.findOne({ key });
        return row ? row.value : null;
    },

    // OPTIMIZED: Track command usage globally
    trackCommandUsage: async (name) => {
        await Stat.findOneAndUpdate({ command: name }, { $inc: { count: 1 } }, { upsert: true });
    },

    // OPTIMIZED: Update interaction and check if profile needs sync
    syncUser: async (userId, fbData = null) => {
        const update = { lastActive: new Date(), $inc: { count: 1 } };
        if (fbData) {
            Object.assign(update, fbData, { lastSynced: new Date() });
        }
        return await UserStat.findOneAndUpdate({ userId }, update, { upsert: true, new: true });
    },

    getUserData: (userId) => UserStat.findOne({ userId }),

    // THE 3-DAY RULE: Only get users active in the last 72 hours
    getAllUsers: async () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        return await UserStat.find({ lastActive: { $gte: threeDaysAgo } }).sort({ lastActive: -1 });
    },

    // DATABASE OPTIMIZATION: Physically delete users older than 3 days
    purgeInactiveUsers: async () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const result = await UserStat.deleteMany({ lastActive: { $lt: threeDaysAgo } });
        if (result.deletedCount > 0) console.log(`🧹 Purged ${result.deletedCount} inactive users.`);
    },

    getStats: () => Stat.find({}).sort({ count: -1 }).limit(5)
};
