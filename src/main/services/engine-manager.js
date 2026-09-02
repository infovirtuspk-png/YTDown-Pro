const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { app } = require('electron');

class EngineManager {
    constructor() {
        this.ytdlpPath = null;
        this.ffmpegPath = null;
        this.ffprobePath = null;
    }

    getEnginePaths() {
        let baseDir;

        // Packaged Electron app vs Development directory
        if (app && app.isPackaged) {
            baseDir = path.join(process.resourcesPath, 'engines');
        } else {
            baseDir = path.join(__dirname, '..', '..', 'engines');
        }

        const ytdlp = path.join(baseDir, 'yt-dlp', 'yt-dlp.exe');
        const ffmpeg = path.join(baseDir, 'ffmpeg', 'ffmpeg.exe');
        const ffprobe = path.join(baseDir, 'ffmpeg', 'ffprobe.exe');

        this.ytdlpPath = fs.existsSync(ytdlp) ? ytdlp : null;
        this.ffmpegPath = fs.existsSync(ffmpeg) ? ffmpeg : null;
        this.ffprobePath = fs.existsSync(ffprobe) ? ffprobe : null;

        return {
            ytdlp: this.ytdlpPath,
            ffmpeg: this.ffmpegPath,
            ffprobe: this.ffprobePath
        };
    }

    async getDiagnostics() {
        const paths = this.getEnginePaths();
        const diagnostics = {
            ytdlp: { status: 'UNAVAILABLE', version: 'N/A', path: paths.ytdlp },
            ffmpeg: { status: 'UNAVAILABLE', version: 'N/A', path: paths.ffmpeg },
            ffprobe: { status: 'UNAVAILABLE', version: 'N/A', path: paths.ffprobe }
        };

        if (paths.ytdlp) {
            try {
                const res = spawnSync(paths.ytdlp, ['--version'], { encoding: 'utf8', timeout: 5000 });
                if (res.stdout) {
                    diagnostics.ytdlp.status = 'READY';
                    diagnostics.ytdlp.version = res.stdout.trim();
                }
            } catch (err) {
                diagnostics.ytdlp.status = 'ERROR';
            }
        }

        if (paths.ffmpeg) {
            try {
                const res = spawnSync(paths.ffmpeg, ['-version'], { encoding: 'utf8', timeout: 5000 });
                if (res.stdout) {
                    const match = res.stdout.match(/ffmpeg version ([^\s]+)/i);
                    diagnostics.ffmpeg.status = 'READY';
                    diagnostics.ffmpeg.version = match ? match[1] : 'Installed';
                }
            } catch (err) {
                diagnostics.ffmpeg.status = 'ERROR';
            }
        }

        if (paths.ffprobe) {
            try {
                const res = spawnSync(paths.ffprobe, ['-version'], { encoding: 'utf8', timeout: 5000 });
                if (res.stdout) {
                    const match = res.stdout.match(/ffprobe version ([^\s]+)/i);
                    diagnostics.ffprobe.status = 'READY';
                    diagnostics.ffprobe.version = match ? match[1] : 'Installed';
                }
            } catch (err) {
                diagnostics.ffprobe.status = 'ERROR';
            }
        }

        return diagnostics;
    }
}

module.exports = new EngineManager();
