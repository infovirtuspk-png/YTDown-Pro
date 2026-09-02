const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

class DatabaseService {
    constructor() {
        this.db = null;
    }

    initialize(dbPath) {
        return new Promise((resolve, reject) => {
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('SQLite connection error:', err);
                    return reject(err);
                }
                this.runMigrations()
                    .then(() => resolve(this.db))
                    .catch(reject);
            });
        });
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    async runMigrations() {
        // Table: Settings
        await this.run(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table: Downloads
        await this.run(`
            CREATE TABLE IF NOT EXISTS downloads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_uuid TEXT UNIQUE NOT NULL,
                source_url TEXT NOT NULL,
                media_id TEXT,
                title TEXT,
                thumbnail TEXT,
                format TEXT,
                quality TEXT,
                audio_quality TEXT,
                file_name TEXT,
                file_path TEXT,
                file_size INTEGER DEFAULT 0,
                status TEXT DEFAULT 'CREATED',
                progress INTEGER DEFAULT 0,
                speed TEXT DEFAULT '0 KB/s',
                eta TEXT DEFAULT '00:00',
                error_message TEXT,
                engine TEXT DEFAULT 'ytdlp',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                completed_at DATETIME
            )
        `);

        // Migration: add engine column if upgrading from older schema
        try {
            await this.run(`ALTER TABLE downloads ADD COLUMN engine TEXT DEFAULT 'ytdlp'`);
        } catch (e) {
            // Column already exists — safe to ignore
        }

        // Table: Application Logs
        await this.run(`
            CREATE TABLE IF NOT EXISTS application_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT DEFAULT 'INFO',
                category TEXT NOT NULL,
                message TEXT NOT NULL,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table: Engine Versions
        await this.run(`
            CREATE TABLE IF NOT EXISTS engine_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                engine_name TEXT UNIQUE NOT NULL,
                version TEXT NOT NULL,
                status TEXT NOT NULL,
                last_checked DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed default settings if empty
        const defaultSettings = [
            { key: 'theme', value: 'light' },
            { key: 'language', value: 'en' },
            { key: 'download_folder', value: '' }, // Will be set to OS Downloads default if blank
            { key: 'max_concurrent', value: '3' },
            { key: 'notifications', value: 'true' },
            { key: 'animations', value: 'true' },
            { key: 'startup', value: 'false' },
            { key: 'clipboard_detect', value: 'true' },
            { key: 'filename_template', value: '%(title)s.%(ext)s' },
            { key: 'default_format', value: 'MP4' },
            { key: 'default_quality', value: 'Best Available' }
        ];

        for (const item of defaultSettings) {
            await this.run(
                `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
                [item.key, item.value]
            );
        }
    }
}

module.exports = new DatabaseService();
