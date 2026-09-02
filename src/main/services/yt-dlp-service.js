const { spawn } = require('child_process');
const path = require('path');
const engineManager = require('./engine-manager');

class YtDlpService {
    analyzeUrl(url) {
        return new Promise((resolve, reject) => {
            const { ytdlp, ffmpeg } = engineManager.getEnginePaths();

            if (!ytdlp) {
                return reject(new Error('yt-dlp engine is unavailable. Please run engine diagnostics.'));
            }

            const args = [
                '--dump-json',
                '--no-playlist',
                '--no-warnings',
                '--no-check-certificates'
            ];

            if (ffmpeg) {
                args.push('--ffmpeg-location', path.dirname(ffmpeg));
            }

            args.push(url);

            const child = spawn(ytdlp, args, { windowsHide: true });
            let stdoutData = '';
            let stderrData = '';

            child.stdout.on('data', (chunk) => {
                stdoutData += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderrData += chunk.toString();
            });

            child.on('close', (code) => {
                if (code !== 0 || !stdoutData.trim()) {
                    console.error('yt-dlp analyze error stderr:', stderrData);
                    return reject(new Error('Failed to retrieve media metadata. Ensure URL is valid and public.'));
                }

                try {
                    const json = JSON.parse(stdoutData);
                    const mediaInfo = this.formatMediaInfo(json);
                    resolve(mediaInfo);
                } catch (parseErr) {
                    reject(new Error('Invalid JSON response from media engine.'));
                }
            });

            child.on('error', (err) => {
                reject(err);
            });
        });
    }

    formatMediaInfo(json) {
        const title = json.title || 'Untitled Media';
        const uploader = json.uploader || json.channel || 'Unknown Uploader';
        const durationSeconds = json.duration || 0;
        const thumbnail = json.thumbnail || (json.thumbnails && json.thumbnails.length ? json.thumbnails[json.thumbnails.length - 1].url : '');
        const webpage_url = json.webpage_url || json.url || '';

        // Extract available video heights
        const availableHeights = new Set();
        const availableAudioFormats = ['MP3', 'M4A', 'WAV', 'FLAC'];

        if (Array.isArray(json.formats)) {
            for (const fmt of json.formats) {
                if (fmt.height && fmt.vcodec !== 'none') {
                    if (fmt.height >= 1080) availableHeights.add('1080p');
                    else if (fmt.height >= 720) availableHeights.add('720p');
                    else if (fmt.height >= 480) availableHeights.add('480p');
                    else if (fmt.height >= 360) availableHeights.add('360p');
                }
            }
        }

        const videoQualities = Array.from(availableHeights);
        if (!videoQualities.includes('1080p')) videoQualities.unshift('1080p'); // default fallbacks
        if (!videoQualities.includes('720p')) videoQualities.push('720p');
        if (!videoQualities.includes('480p')) videoQualities.push('480p');
        if (!videoQualities.includes('360p')) videoQualities.push('360p');

        return {
            id: json.id || '',
            url: webpage_url,
            title,
            uploader,
            duration: this.formatDuration(durationSeconds),
            durationSeconds,
            thumbnail,
            domain: json.extractor_key || 'Media Source',
            videoQualities,
            audioFormats: availableAudioFormats,
            audioQualities: ['320 kbps', '256 kbps', '192 kbps', '128 kbps']
        };
    }

    formatDuration(seconds) {
        if (!seconds) return '00:00';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const pad = (n) => String(n).padStart(2, '0');
        return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
    }

    downloadMedia(jobConfig, onProgress) {
        return new Promise((resolve, reject) => {
            const { ytdlp, ffmpeg } = engineManager.getEnginePaths();

            if (!ytdlp) {
                return reject(new Error('yt-dlp engine is unavailable.'));
            }

            const args = ['--newline', '--no-warnings', '--no-check-certificates'];

            if (ffmpeg) {
                args.push('--ffmpeg-location', path.dirname(ffmpeg));
            }

            const isAudioOnly = ['MP3', 'M4A', 'WAV', 'FLAC'].includes(jobConfig.format.toUpperCase());

            if (isAudioOnly) {
                args.push('-x'); // extract audio
                args.push('--audio-format', jobConfig.format.toLowerCase());
                const bitrate = (jobConfig.audio_quality || '320 kbps').replace(/[^0-9]/g, '');
                if (bitrate) {
                    args.push('--audio-quality', `${bitrate}K`);
                }
            } else {
                // Video quality selection
                let qualityFilter = 'bestvideo+bestaudio/best';
                if (jobConfig.quality.includes('1080p')) {
                    qualityFilter = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
                } else if (jobConfig.quality.includes('720p')) {
                    qualityFilter = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
                } else if (jobConfig.quality.includes('480p')) {
                    qualityFilter = 'bestvideo[height<=480]+bestaudio/best[height<=480]';
                } else if (jobConfig.quality.includes('360p')) {
                    qualityFilter = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
                }
                args.push('-f', qualityFilter);
                args.push('--merge-output-format', jobConfig.format.toLowerCase());
            }

            // Output path template
            const outputTemplate = path.join(jobConfig.outputDir, '%(title)s.%(ext)s');
            args.push('-o', outputTemplate);
            args.push(jobConfig.url);

            const child = spawn(ytdlp, args, { windowsHide: true });
            let finalFilePath = '';
            let lastErrorMsg = '';

            child.stdout.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();

                    // Parse destination filename
                    if (trimmed.includes('[download] Destination:') || trimmed.includes('[Merger] Merging formats into')) {
                        const parts = trimmed.split(/Destination:|into/);
                        if (parts[1]) {
                            finalFilePath = parts[1].trim().replace(/^"|"$/g, '');
                        }
                    }

                    // Parse progress
                    const progressMatch = trimmed.match(/\[download\]\s+(\d+\.\d+)%\s+of\s+(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)/);
                    if (progressMatch) {
                        const progress = Math.round(parseFloat(progressMatch[1]));
                        const totalSize = progressMatch[2];
                        const speed = progressMatch[3];
                        const eta = progressMatch[4];

                        onProgress({
                            progress,
                            speed,
                            eta,
                            totalSize,
                            status: progress < 100 ? 'DOWNLOADING' : 'PROCESSING'
                        });
                    } else if (trimmed.includes('[ExtractAudio]') || trimmed.includes('[Merger]')) {
                        onProgress({
                            progress: 95,
                            speed: 'Converting...',
                            eta: '00:01',
                            status: 'CONVERTING'
                        });
                    }
                }
            });

            child.stderr.on('data', (chunk) => {
                const errStr = chunk.toString();
                if (!errStr.includes('WARNING')) {
                    lastErrorMsg += errStr;
                }
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        filePath: finalFilePath || path.join(jobConfig.outputDir, `${jobConfig.title}.${jobConfig.format.toLowerCase()}`)
                    });
                } else {
                    reject(new Error(lastErrorMsg.trim() || `Download process exited with code ${code}`));
                }
            });

            // Return cancellation handle
            return {
                cancel: () => {
                    child.kill('SIGTERM');
                }
            };
        });
    }
}

module.exports = new YtDlpService();
