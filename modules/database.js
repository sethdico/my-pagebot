const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

if (uri) {
    mongoose.connect(uri)
        .then(() => console.log("🟢 connected to mongodb atlas."))
        .catch(err => console.error("🔴 mongodb error:", err.message));
}

const BanSchema = new mongoose.Schema({ userId: { type: String, unique: true } });
const ReminderSchema = new mongoose.Schema({ id: String, userId: String, message: String, fireAt: Number });
const SettingSchema = new mongoose.Schema({ key: { type: String, unique: true }, value: String });
const StatsSchema = new mongoose.Schema({ command: { type: String, unique: true }, count: { type: Number, default: 0 } });
const UserStatsSchema = new mongoose.Schema({ userId: { type: String, unique: true }, name: String, count: { type: Number, default: 0 } });

const Ban = mongoose.model('Ban', BanSchema);
const Reminder = mongoose.model('Reminder', ReminderSchema);
const Setting = mongoose.model('Setting', SettingSchema);
const Stat = mongoose.model('Stat', StatsSchema);
const UserStat = mongoose.model('UserStat', UserStatsSchema);

module.exports = {
    addBan: (id) => Ban.create({ userId: id }).catch(() => {}),
    removeBan: (id) => Ban.deleteOne({ userId: id }),
    loadBansIntoMemory: async (cb) => {
        const rows = await Ban.find({});
        cb(new Set(rows.map(r => r.userId)));
    },
    addReminder: (r) => Reminder.create(r),
    deleteReminder: (id) => Reminder.deleteOne({ id }),
    getActiveReminders: async (cb) => {
        const rows = await Reminder.find({ fireAt: { $gt: Date.now() } });
        cb(rows);
    },
    setSetting: (key, val) => Setting.findOneAndUpdate({ key }, { value: val }, { upsert: true }),
    getSetting: async (key) => {
        const row = await Setting.findOne({ key });
        return row ? row.value : null;
    },
    trackCommand: async (name, userId, userName) => {
        await Stat.findOneAndUpdate({ command: name }, { $inc: { count: 1 } }, { upsert: true });
        await UserStat.findOneAndUpdate({ userId }, { name: userName, $inc: { count: 1 } }, { upsert: true });
    },
    getStats: () => Stat.find({}).sort({ count: -1 }).limit(5),
    getAllUsers: () => UserStat.find({}).sort({ count: -1 }).limit(15)
};
