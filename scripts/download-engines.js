const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const ENGINES_DIR = path.join(__dirname, '..', 'src', 'engines');
const YTDLP_DIR = path.join(ENGINES_DIR, 'yt-dlp');
const FFMPEG_DIR = path.join(ENGINES_DIR, 'ffmpeg');

// Official download URLs for standalone Windows 64-bit binaries
const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const FFMPEG_ZIP_URL = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading ${url} -> ${destPath}...`);
        const file = fs.createWriteStream(destPath);
        
        const request = (targetUrl) => {
            https.get(targetUrl, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    return request(response.headers.location);
                }
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to download: Status ${response.statusCode}`));
                }

                const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
                let downloadedBytes = 0;

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    if (totalBytes > 0) {
                        const pct = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                        process.stdout.write(`\rProgress: ${pct}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close(() => {
                        console.log('\nDownload complete.');
                        resolve();
                    });
                });
            }).on('error', (err) => {
                fs.unlink(destPath, () => reject(err));
            });
        };

        request(url);
    });
}

async function setupEngines() {
    ensureDir(YTDLP_DIR);
    ensureDir(FFMPEG_DIR);

    const ytdlpExe = path.join(YTDLP_DIR, 'yt-dlp.exe');
    const ffmpegExe = path.join(FFMPEG_DIR, 'ffmpeg.exe');
    const ffprobeExe = path.join(FFMPEG_DIR, 'ffprobe.exe');

    console.log('--- YTDown Pro Engine Verifier ---');

    // 1. Verify / Download yt-dlp
    if (!fs.existsSync(ytdlpExe)) {
        console.log('[+] yt-dlp.exe missing. Downloading latest official release...');
        try {
            await downloadFile(YTDLP_URL, ytdlpExe);
            console.log('[✓] yt-dlp.exe ready.');
        } catch (err) {
            console.error('[✕] Error downloading yt-dlp.exe:', err.message);
        }
    } else {
        console.log('[✓] yt-dlp.exe exists.');
    }

    // 2. Verify / Download FFmpeg & FFprobe
    if (!fs.existsSync(ffmpegExe) || !fs.existsSync(ffprobeExe)) {
        console.log('[+] FFmpeg/FFprobe missing. Downloading latest standalone binaries...');
        const zipPath = path.join(FFMPEG_DIR, 'ffmpeg-build.zip');
        try {
            await downloadFile(FFMPEG_ZIP_URL, zipPath);
            console.log('Extracting FFmpeg package using PowerShell...');
            
            // Extract zip via powershell
            const psCmd = `Expand-Archive -Path "${zipPath}" -DestinationPath "${FFMPEG_DIR}" -Force`;
            spawnSync('powershell', ['-Command', psCmd], { stdio: 'inherit' });

            // Find extracted executables in subfolder
            const items = fs.readdirSync(FFMPEG_DIR);
            const extractedSubfolder = items.find(item => item.startsWith('ffmpeg-') && fs.statSync(path.join(FFMPEG_DIR, item)).isDirectory());

            if (extractedSubfolder) {
                const binPath = path.join(FFMPEG_DIR, extractedSubfolder, 'bin');
                if (fs.existsSync(path.join(binPath, 'ffmpeg.exe'))) {
                    fs.copyFileSync(path.join(binPath, 'ffmpeg.exe'), ffmpegExe);
                }
                if (fs.existsSync(path.join(binPath, 'ffprobe.exe'))) {
                    fs.copyFileSync(path.join(binPath, 'ffprobe.exe'), ffprobeExe);
                }
                // Cleanup temp extracted subfolder & zip
                fs.rmSync(path.join(FFMPEG_DIR, extractedSubfolder), { recursive: true, force: true });
            }

            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }

            console.log('[✓] FFmpeg and FFprobe executables configured.');
        } catch (err) {
            console.error('[✕] Error downloading/extracting FFmpeg:', err.message);
        }
    } else {
        console.log('[✓] FFmpeg & FFprobe executables exist.');
    }

    console.log('--- Engine verification finished ---\n');
}

if (require.main === module) {
    setupEngines().catch(console.error);
}

module.exports = { setupEngines };
