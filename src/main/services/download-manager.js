const path = require('path');
const fs = require('fs');
const downloadsRepo = require('../../database/repositories/downloads-repository');
const settingsRepo = require('../../database/repositories/settings-repository');
const ytDlpService = require('./yt-dlp-service');
const universalDownloader = require('./universal-downloader');
const fileService = require('./file-service');

// File extensions that use the Universal Direct File Downloader (not yt-dlp)
const UNIVERSAL_EXTENSIONS = new Set([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'json', 'xml',
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
    'exe', 'msi', 'apk', 'dmg', 'iso', 'deb', 'rpm',
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico',
    'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v'
]);

function isUniversalJob(job) {
    // Explicit engine tag stored in DB
    if (job.engine === 'universal') return true;
    if (job.engine === 'ytdlp') return false;

    // Fallback: inspect file extension from URL
    try {
        const url = new URL(job.source_url);
        const ext = path.extname(url.pathname).replace('.', '').toLowerCase();
        if (ext && UNIVERSAL_EXTENSIONS.has(ext)) return true;
    } catch (e) {}

    return false;
}

class DownloadManager {
    constructor() {
        this.activeProcesses = new Map(); // jobUuid -> handle/promise
        this.isProcessingQueue = false;
        this.mainWindow = null;
    }

    setMainWindow(window) {
        this.mainWindow = window;
    }

    notifyRenderer(channel, payload) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, payload);
        }
    }

    async addJob(jobInput) {
        const jobUuid = 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const defaultFolder = fileService.getDefaultDownloadFolder();
        const outputDir = jobInput.outputDirectory || (await settingsRepo.get('download_folder')) || defaultFolder;

        const jobData = {
            job_uuid: jobUuid,
            source_url: jobInput.url,
            media_id: jobInput.media_id || '',
            title: jobInput.title || jobInput.filename || 'Preparing download...',
            thumbnail: jobInput.thumbnail || '',
            format: jobInput.format || 'MP4',
            quality: jobInput.quality || '1080p',
            audio_quality: jobInput.audioQuality || '320 kbps',
            file_name: jobInput.filename || '',
            file_path: outputDir,
            engine: jobInput.engine || 'ytdlp',
            status: 'QUEUED'
        };

        const createdJob = await downloadsRepo.createJob(jobData);
        this.notifyRenderer('download:created', createdJob);
        this.processQueue();
        return createdJob;
    }

    async processQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;

        try {
            const maxConcurrent = parseInt((await settingsRepo.get('max_concurrent')) || '3', 10);
            const activeQueue = await downloadsRepo.getActiveQueue();
            const runningCount = activeQueue.filter(j => j.status === 'DOWNLOADING' || j.status === 'CONVERTING').length;
            const pendingJobs = activeQueue.filter(j => j.status === 'QUEUED');
            let availableSlots = maxConcurrent - runningCount;

            for (const job of pendingJobs) {
                if (availableSlots <= 0) break;
                availableSlots--;
                this.executeJob(job).catch(console.error);
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    async executeJob(job) {
        const jobUuid = job.job_uuid;
        await downloadsRepo.updateStatus(jobUuid, 'DOWNLOADING');
        this.notifyRenderer('download:updated', { job_uuid: jobUuid, status: 'DOWNLOADING', progress: 0 });

        const outputDir = job.file_path || fileService.getDefaultDownloadFolder();

        try {
            if (isUniversalJob(job)) {
                // UNIVERSAL FILE DOWNLOADER ENGINE (PDF, DOCX, ZIP, EXE, ISO, JPG, etc.)
                const filename = job.file_name || job.title || `file_${Date.now()}`;
                
                await new Promise((resolve, reject) => {
                    universalDownloader.downloadFile(
                        {
                            uuid: jobUuid,
                            url: job.source_url,
                            save_path: outputDir,
                            filename: filename
                        },
                        async (progressData) => {
                            await downloadsRepo.updateProgress(jobUuid, progressData);
                            this.notifyRenderer('download:progress', {
                                job_uuid: jobUuid,
                                ...progressData
                            });
                        },
                        async (completionData) => {
                            const finalPath = completionData.targetPath;
                            const fileSize = completionData.totalBytes;
                            const fileName = path.basename(finalPath);

                            await downloadsRepo.markCompleted(jobUuid, {
                                filePath: finalPath,
                                fileName,
                                fileSize
                            });

                            this.activeProcesses.delete(jobUuid);
                            this.notifyRenderer('download:completed', {
                                job_uuid: jobUuid,
                                filePath: finalPath,
                                fileName,
                                fileSize,
                                title: job.title
                            });
                            resolve();
                        },
                        (err) => reject(err)
                    );
                });

            } else {
                // MEDIA DOWNLOADER ENGINE (yt-dlp + FFmpeg)
                const jobConfig = {
                    url: job.source_url,
                    title: job.title,
                    format: job.format,
                    quality: job.quality,
                    audio_quality: job.audio_quality,
                    outputDir
                };

                const downloadPromise = ytDlpService.downloadMedia(jobConfig, async (progressData) => {
                    await downloadsRepo.updateProgress(jobUuid, progressData);
                    this.notifyRenderer('download:progress', {
                        job_uuid: jobUuid,
                        ...progressData
                    });
                });

                this.activeProcesses.set(jobUuid, downloadPromise);
                const result = await downloadPromise;

                let finalPath = result.filePath;
                let fileSize = 0;

                if (fs.existsSync(finalPath)) {
                    const stats = fs.statSync(finalPath);
                    fileSize = stats.size;
                }

                const fileName = path.basename(finalPath);
                await downloadsRepo.markCompleted(jobUuid, {
                    filePath: finalPath,
                    fileName,
                    fileSize
                });

                this.activeProcesses.delete(jobUuid);
                this.notifyRenderer('download:completed', {
                    job_uuid: jobUuid,
                    filePath: finalPath,
                    fileName,
                    fileSize,
                    title: job.title
                });
            }

        } catch (err) {
            this.activeProcesses.delete(jobUuid);
            console.error(`Job ${jobUuid} failed:`, err);
            await downloadsRepo.markFailed(jobUuid, err.message);
            this.notifyRenderer('download:failed', {
                job_uuid: jobUuid,
                errorMessage: err.message,
                title: job.title
            });
        } finally {
            this.processQueue();
        }
    }

    async pauseJob(jobUuid) {
        if (this.activeProcesses.has(jobUuid)) {
            const handle = this.activeProcesses.get(jobUuid);
            if (handle && typeof handle.cancel === 'function') {
                handle.cancel();
            } else {
                universalDownloader.pauseJob(jobUuid);
            }
            this.activeProcesses.delete(jobUuid);
        }

        await downloadsRepo.updateStatus(jobUuid, 'PAUSED');
        this.notifyRenderer('download:paused', { job_uuid: jobUuid });
        this.processQueue();
    }

    async resumeJob(jobUuid) {
        await downloadsRepo.updateStatus(jobUuid, 'QUEUED');
        this.notifyRenderer('download:resumed', { job_uuid: jobUuid });
        this.processQueue();
    }

    async cancelJob(jobUuid) {
        if (this.activeProcesses.has(jobUuid)) {
            const handle = this.activeProcesses.get(jobUuid);
            if (handle && typeof handle.cancel === 'function') {
                handle.cancel();
            } else {
                universalDownloader.cancelJob(jobUuid);
            }
            this.activeProcesses.delete(jobUuid);
        }

        await downloadsRepo.updateStatus(jobUuid, 'CANCELLED');
        this.notifyRenderer('download:cancelled', { job_uuid: jobUuid });
        this.processQueue();
    }

    async deleteJob(jobUuid, deleteFile = false) {
        if (this.activeProcesses.has(jobUuid)) {
            await this.cancelJob(jobUuid);
        }

        const job = await downloadsRepo.getJobByUuid(jobUuid);
        if (job && deleteFile) {
            try {
                if (job.file_path && fs.existsSync(job.file_path)) {
                    fs.unlinkSync(job.file_path);
                }
                const tmpPath = `${job.file_path}.tmp`;
                if (fs.existsSync(tmpPath)) {
                    fs.unlinkSync(tmpPath);
                }
            } catch (err) {
                console.warn(`Could not delete file for job ${jobUuid}:`, err.message);
            }
        }

        await downloadsRepo.deleteJob(jobUuid);
        this.notifyRenderer('download:deleted', { job_uuid: jobUuid });
    }

    async clearCompleted() {
        const all = await downloadsRepo.getAllDownloads();
        const completed = all.filter(d => d.status === 'COMPLETED' || d.status === 'FAILED' || d.status === 'CANCELLED');
        for (const job of completed) {
            await downloadsRepo.deleteJob(job.job_uuid);
        }
        this.notifyRenderer('download:cleared-completed', {});
    }

    async pauseAllJobs() {
        for (const [jobUuid, handle] of this.activeProcesses.entries()) {
            if (handle && typeof handle.cancel === 'function') {
                handle.cancel();
            } else {
                universalDownloader.pauseJob(jobUuid);
            }
            await downloadsRepo.updateStatus(jobUuid, 'PAUSED');
        }
        this.activeProcesses.clear();
        this.notifyRenderer('download:queue-paused', {});
    }

    async resumeAllJobs() {
        const activeQueue = await downloadsRepo.getAllDownloads();
        const pausedJobs = activeQueue.filter(j => j.status === 'PAUSED' || j.status === 'QUEUED');
        for (const job of pausedJobs) {
            await downloadsRepo.updateStatus(job.job_uuid, 'QUEUED');
        }
        this.processQueue();
        this.notifyRenderer('download:queue-resumed', {});
    }
}

module.exports = new DownloadManager();
