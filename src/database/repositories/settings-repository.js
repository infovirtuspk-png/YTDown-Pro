const db = require('../database');

class SettingsRepository {
    async getAll() {
        const rows = await db.all('SELECT key, value FROM settings');
        const settingsMap = {};
        for (const row of rows) {
            settingsMap[row.key] = row.value;
        }
        return settingsMap;
    }

    async get(key) {
        const row = await db.get('SELECT value FROM settings WHERE key = ?', [key]);
        return row ? row.value : null;
    }

    async set(key, value) {
        return db.run(
            `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
            [key, String(value)]
        );
    }

    async updateMultiple(settingsObj) {
        for (const [key, value] of Object.entries(settingsObj)) {
            await this.set(key, value);
        }
        return this.getAll();
    }
}

module.exports = new SettingsRepository();
