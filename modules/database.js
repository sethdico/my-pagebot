const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../bot_data.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS bans (id TEXT PRIMARY KEY)`);
    db.run(`CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, userId TEXT, message TEXT, fireAt INTEGER)`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    
    // Maintenance: Delete old records and shrink database
    db.run(`DELETE FROM reminders WHERE fireAt < ${Date.now()}`);
    db.run(`VACUUM`); 
});

module.exports = {
    addBan: (id) => db.run("INSERT OR REPLACE INTO bans (id) VALUES (?)", [id]),
    removeBan: (id) => db.run("DELETE FROM bans WHERE id = ?", [id]),
    loadBansIntoMemory: (cb) => db.all("SELECT id FROM bans", (err, rows) => cb(new Set(rows?.map(r => r.id) || []))),
    addReminder: (r) => db.run("INSERT INTO reminders VALUES (?,?,?,?)", [r.id, r.userId, r.message, r.fireAt]),
    deleteReminder: (id) => db.run("DELETE FROM reminders WHERE id = ?", [id]),
    getActiveReminders: (cb) => db.all("SELECT * FROM reminders WHERE fireAt > ?", [Date.now()], (err, rows) => cb(rows || [])),
    setSetting: (key, val) => db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, val]),
    getSetting: (key) => new Promise((res) => {
        db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => res(row ? row.value : null));
    })
};
