const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const engineManager = require('./engine-manager');

class FFmpegService {
    convertAudio(inputPath, outputPath, format = 'mp3', bitrate = '320k') {
        return new Promise((resolve, reject) => {
            const { ffmpeg } = engineManager.getEnginePaths();
            if (!ffmpeg) {
                return reject(new Error('FFmpeg binary is unavailable for audio conversion.'));
            }

            if (!fs.existsSync(inputPath)) {
                return reject(new Error('Source input file does not exist.'));
            }

            const args = [
                '-y',
                '-i', inputPath,
                '-vn', // no video
                '-ab', bitrate,
                '-ar', '44100',
                outputPath
            ];

            const child = spawn(ffmpeg, args, { windowsHide: true });
            let stderrData = '';

            child.stderr.on('data', (chunk) => {
                stderrData += chunk.toString();
            });

            child.on('close', (code) => {
                if (code === 0 && fs.existsSync(outputPath)) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`FFmpeg audio conversion failed with code ${code}: ${stderrData}`));
                }
            });

            child.on('error', (err) => reject(err));
        });
    }
}

module.exports = new FFmpegService();
