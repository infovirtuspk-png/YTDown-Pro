const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

class UniversalDownloader {
    constructor() {
        this.activeJobs = new Map(); // uuid -> { req, fileStream, isPaused, isCancelled }
    }

    /**
     * Download direct file via HTTP/HTTPS with resume & progress support
     */
    downloadFile(job, onProgress, onComplete, onError) {
        const { uuid, url, save_path, filename } = job;

        // Sanitize filename — strip any path separators that crept in from URL segments
        const safeFilename = path.basename(filename).replace(/[<>:"/\\|?*]/g, '_') || `download_${Date.now()}`;

        const targetPath = path.join(save_path, safeFilename);
        const tempPath = `${targetPath}.tmp`;

        // Ensure the save directory exists (prevent ENOENT)
        try {
            fs.mkdirSync(save_path, { recursive: true });
        } catch (e) {
            return onError(new Error(`Cannot create save directory: ${save_path} — ${e.message}`));
        }

        let downloadedBytes = 0;
        if (fs.existsSync(tempPath)) {
            const stats = fs.statSync(tempPath);
            downloadedBytes = stats.size;
        }

        const jobControl = {
            req: null,
            fileStream: null,
            isPaused: false,
            isCancelled: false
        };
        this.activeJobs.set(uuid, jobControl);

        const startTime = Date.now();
        let lastTime = startTime;
        let lastBytes = downloadedBytes;

        const makeRequest = (currentUrl, redirectCount = 0) => {
            if (redirectCount > 5) {
                onError(new Error('Too many HTTP redirects'));
                return;
            }

            if (jobControl.isCancelled) return;

            const parsedUrl = new URL(currentUrl);
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) YTDownPro/1.0'
            };

            if (downloadedBytes > 0) {
                headers['Range'] = `bytes=${downloadedBytes}-`;
            }

            const req = client.get(currentUrl, { headers }, (res) => {
                // Handle HTTP Redirects (301, 302, 307, 308)
                if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                    const redirectUrl = new URL(res.headers.location, currentUrl).href;
                    makeRequest(redirectUrl, redirectCount + 1);
                    return;
                }

                if (res.statusCode !== 200 && res.statusCode !== 206) {
                    onError(new Error(`HTTP Server responded with status code ${res.statusCode}`));
                    return;
                }

                const contentLength = parseInt(res.headers['content-length'] || '0', 10);
                const totalBytes = downloadedBytes + contentLength;

                const fileFlags = downloadedBytes > 0 ? 'a' : 'w';
                const fileStream = fs.createWriteStream(tempPath, { flags: fileFlags });
                jobControl.fileStream = fileStream;

                res.on('data', (chunk) => {
                    if (jobControl.isCancelled || jobControl.isPaused) {
                        res.destroy();
                        return;
                    }

                    downloadedBytes += chunk.length;
                    fileStream.write(chunk);

                    const now = Date.now();
                    const timeDiff = (now - lastTime) / 1000;

                    if (timeDiff >= 0.5) {
                        const bytesDiff = downloadedBytes - lastBytes;
                        const speedBps = bytesDiff / timeDiff;
                        const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
                        const remainingBytes = totalBytes - downloadedBytes;
                        const eta = speedBps > 0 ? Math.round(remainingBytes / speedBps) : 0;

                        onProgress({
                            uuid,
                            downloadedBytes,
                            totalBytes,
                            progress: percent,
                            speed: this.formatSpeed(speedBps),
                            eta: this.formatEta(eta)
                        });

                        lastTime = now;
                        lastBytes = downloadedBytes;
                    }
                });

                res.on('end', () => {
                    fileStream.end(async () => {
                        if (jobControl.isCancelled) return;

                        if (jobControl.isPaused) {
                            onProgress({ uuid, status: 'PAUSED', progress: Math.round((downloadedBytes / (totalBytes || 1)) * 100) });
                            return;
                        }

                        // Rename tempPath to targetPath upon completion
                        try {
                            if (fs.existsSync(targetPath)) {
                                fs.unlinkSync(targetPath);
                            }
                            fs.renameSync(tempPath, targetPath);
                            this.activeJobs.delete(uuid);
                            onComplete({ uuid, targetPath, totalBytes: downloadedBytes });
                        } catch (renameErr) {
                            onError(renameErr);
                        }
                    });
                });

                res.on('error', (err) => {
                    fileStream.end();
                    onError(err);
                });
            });

            req.on('error', (err) => {
                if (jobControl.isCancelled || jobControl.isPaused) return;
                onError(err);
            });

            jobControl.req = req;
        };

        makeRequest(url);
    }

    pauseJob(uuid) {
        const control = this.activeJobs.get(uuid);
        if (control) {
            control.isPaused = true;
            if (control.req) control.req.destroy();
            if (control.fileStream) control.fileStream.end();
        }
    }

    cancelJob(uuid) {
        const control = this.activeJobs.get(uuid);
        if (control) {
            control.isCancelled = true;
            if (control.req) control.req.destroy();
            if (control.fileStream) control.fileStream.end();
            this.activeJobs.delete(uuid);
        }
    }

    formatSpeed(bps) {
        if (bps >= 1048576) return `${(bps / 1048576).toFixed(2)} MB/s`;
        if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
        return `${Math.round(bps)} B/s`;
    }

    formatEta(seconds) {
        if (seconds <= 0) return '0s';
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }
}

module.exports = new UniversalDownloader();
