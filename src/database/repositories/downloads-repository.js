const db = require('../database');

class DownloadsRepository {
    async createJob(jobData) {
        const sql = `
            INSERT INTO downloads (
                job_uuid, source_url, media_id, title, thumbnail, format, quality, audio_quality,
                file_name, file_path, engine, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        const params = [
            jobData.job_uuid,
            jobData.source_url,
            jobData.media_id || '',
            jobData.title || 'Analyzing Media...',
            jobData.thumbnail || '',
            jobData.format || 'MP4',
            jobData.quality || 'Best Available',
            jobData.audio_quality || '',
            jobData.file_name || '',
            jobData.file_path || '',
            jobData.engine || 'ytdlp',
            jobData.status || 'QUEUED'
        ];
        const res = await db.run(sql, params);
        return this.getJobByUuid(jobData.job_uuid);
    }

    async getJobByUuid(jobUuid) {
        return db.get('SELECT * FROM downloads WHERE job_uuid = ?', [jobUuid]);
    }

    async updateProgress(jobUuid, progressData) {
        const sql = `
            UPDATE downloads 
            SET progress = ?, speed = ?, eta = ?, status = ?
            WHERE job_uuid = ?
        `;
        return db.run(sql, [
            progressData.progress || 0,
            progressData.speed || '0 KB/s',
            progressData.eta || '00:00',
            progressData.status || 'DOWNLOADING',
            jobUuid
        ]);
    }

    async markCompleted(jobUuid, fileDetails) {
        const sql = `
            UPDATE downloads
            SET status = 'COMPLETED', progress = 100, file_path = ?, file_name = ?, file_size = ?, completed_at = CURRENT_TIMESTAMP
            WHERE job_uuid = ?
        `;
        return db.run(sql, [
            fileDetails.filePath,
            fileDetails.fileName,
            fileDetails.fileSize || 0,
            jobUuid
        ]);
    }

    async markFailed(jobUuid, errorMessage) {
        const sql = `
            UPDATE downloads
            SET status = 'FAILED', error_message = ?
            WHERE job_uuid = ?
        `;
        return db.run(sql, [errorMessage, jobUuid]);
    }

    async updateStatus(jobUuid, status) {
        const sql = 'UPDATE downloads SET status = ? WHERE job_uuid = ?';
        return db.run(sql, [status, jobUuid]);
    }

    async getAllDownloads() {
        return db.all('SELECT * FROM downloads ORDER BY id DESC');
    }

    async getActiveQueue() {
        return db.all("SELECT * FROM downloads WHERE status IN ('QUEUED', 'PREPARING', 'ANALYZING', 'DOWNLOADING', 'CONVERTING') ORDER BY id ASC");
    }

    async getHistory(filter = 'all', searchQuery = '') {
        let sql = "SELECT * FROM downloads WHERE status IN ('COMPLETED', 'FAILED', 'CANCELLED')";
        const params = [];

        if (filter !== 'all') {
            sql += ' AND lower(format) = ?';
            params.push(filter.toLowerCase());
        }

        if (searchQuery) {
            sql += ' AND lower(title) LIKE ?';
            params.push(`%${searchQuery.toLowerCase()}%`);
        }

        sql += ' ORDER BY completed_at DESC, id DESC';
        return db.all(sql, params);
    }

    async findExistingDownload(sourceUrl) {
        return db.get(
            "SELECT * FROM downloads WHERE source_url = ? AND status = 'COMPLETED' ORDER BY completed_at DESC LIMIT 1",
            [sourceUrl]
        );
    }

    async deleteJob(jobUuid) {
        return db.run('DELETE FROM downloads WHERE job_uuid = ?', [jobUuid]);
    }

    async clearHistory() {
        return db.run("DELETE FROM downloads");
    }
}

module.exports = new DownloadsRepository();
