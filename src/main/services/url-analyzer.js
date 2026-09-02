const http = require('http');
const https = require('https');
const { URL } = require('url');
const path = require('path');
const ytdlpService = require('./yt-dlp-service');

class UrlAnalyzer {
    /**
     * Smart URL Detection & Metadata Inspection
     */
    async analyze(urlStr) {
        if (!urlStr || typeof urlStr !== 'string') {
            throw new Error('Valid URL string is required');
        }

        const cleanUrl = urlStr.trim();

        // 1. Check if URL is a known streaming media site (YouTube, Vimeo, TikTok, etc.)
        if (this.isMediaPlatformUrl(cleanUrl)) {
            const ytInfo = await ytdlpService.analyzeUrl(cleanUrl);
            return {
                engine: 'ytdlp',
                type: 'media_stream',
                category: 'Media',
                title: ytInfo.title,
                thumbnail: ytInfo.thumbnail,
                duration: ytInfo.duration,
                uploader: ytInfo.uploader,
                formats: ytInfo.formats,
                url: cleanUrl
            };
        }

        // 2. Perform HTTP HEAD request to detect Content-Type & File details
        try {
            const headInfo = await this.probeUrl(cleanUrl);

            // If Content-Type indicates streaming video page or HTML, test with yt-dlp first
            if (headInfo.contentType.includes('text/html')) {
                try {
                    const ytInfo = await ytdlpService.analyzeUrl(cleanUrl);
                    return {
                        engine: 'ytdlp',
                        type: 'media_stream',
                        category: 'Media',
                        title: ytInfo.title,
                        thumbnail: ytInfo.thumbnail,
                        duration: ytInfo.duration,
                        uploader: ytInfo.uploader,
                        formats: ytInfo.formats,
                        url: cleanUrl
                    };
                } catch (e) {
                    // Fallthrough to direct file analysis
                }
            }

            const category = this.detectCategory(headInfo.contentType, headInfo.filename || cleanUrl);
            const ext = headInfo.ext || this.extractExtension(headInfo.filename || cleanUrl);

            return {
                engine: 'universal',
                type: 'direct_file',
                category: category,
                title: headInfo.filename || this.suggestFilename(cleanUrl, ext),
                filename: headInfo.filename || this.suggestFilename(cleanUrl, ext),
                filesize: headInfo.contentLength,
                contentType: headInfo.contentType,
                extension: ext,
                url: cleanUrl,
                formats: [{
                    format_id: ext,
                    ext: ext,
                    resolution: `${category} File`,
                    filesize: headInfo.contentLength,
                    note: `Direct ${category} Download`
                }]
            };

        } catch (err) {
            // Final fallback: try yt-dlp
            try {
                const ytInfo = await ytdlpService.analyzeUrl(cleanUrl);
                return {
                    engine: 'ytdlp',
                    type: 'media_stream',
                    category: 'Media',
                    title: ytInfo.title,
                    thumbnail: ytInfo.thumbnail,
                    duration: ytInfo.duration,
                    uploader: ytInfo.uploader,
                    formats: ytInfo.formats,
                    url: cleanUrl
                };
            } catch (ytErr) {
                throw new Error(`Unable to analyze URL: ${err.message}`);
            }
        }
    }

    isMediaPlatformUrl(urlStr) {
        const patterns = [
            /youtube\.com\/watch/i,
            /youtu\.be\//i,
            /youtube\.com\/shorts/i,
            /vimeo\.com\//i,
            /tiktok\.com\//i,
            /instagram\.com\/(p|reel)\//i,
            /twitter\.com\/.*\/status/i,
            /x\.com\/.*\/status/i,
            /facebook\.com\/.*\/videos/i,
            /dailymotion\.com/i,
            /soundcloud\.com/i
        ];
        return patterns.some(p => p.test(urlStr));
    }

    probeUrl(urlStr) {
        return new Promise((resolve, reject) => {
            const parsed = new URL(urlStr);
            const client = parsed.protocol === 'https:' ? https : http;

            const req = client.request(urlStr, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 YTDownPro/1.0' } }, (res) => {
                const contentType = res.headers['content-type'] || 'application/octet-stream';
                const contentLength = parseInt(res.headers['content-length'] || '0', 10);
                
                let filename = null;
                const disposition = res.headers['content-disposition'];
                if (disposition && disposition.includes('filename=')) {
                    const match = disposition.match(/filename="?([^";]+)"?/);
                    if (match && match[1]) filename = match[1];
                }

                resolve({
                    contentType,
                    contentLength,
                    filename,
                    statusCode: res.statusCode
                });
            });

            req.on('error', (err) => reject(err));
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('HEAD probe timeout'));
            });
            req.end();
        });
    }

    detectCategory(contentType, filenameOrUrl) {
        const ext = this.extractExtension(filenameOrUrl).toLowerCase();

        // 1. Media
        if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg'].includes(ext) || contentType.startsWith('video/') || contentType.startsWith('audio/')) {
            return 'Media';
        }
        // 2. Documents
        if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'json', 'xml'].includes(ext) || contentType.includes('pdf') || contentType.includes('document')) {
            return 'Documents';
        }
        // 3. Archives
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || contentType.includes('zip') || contentType.includes('compressed')) {
            return 'Archives';
        }
        // 4. Software
        if (['exe', 'msi', 'apk', 'dmg', 'iso'].includes(ext)) {
            return 'Software';
        }
        // 5. Images
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp'].includes(ext) || contentType.startsWith('image/')) {
            return 'Images';
        }

        return 'General';
    }

    extractExtension(filenameOrUrl) {
        try {
            const urlObj = new URL(filenameOrUrl.startsWith('http') ? filenameOrUrl : `http://dummy.com/${filenameOrUrl}`);
            const pathname = urlObj.pathname;
            const ext = path.extname(pathname).replace('.', '');
            return ext || 'download';
        } catch (e) {
            return 'download';
        }
    }

    suggestFilename(urlStr, ext) {
        try {
            const parsed = new URL(urlStr);
            const base = path.basename(parsed.pathname) || 'download';
            return base.includes('.') ? base : `${base}.${ext}`;
        } catch (e) {
            return `file_${Date.now()}.${ext}`;
        }
    }
}

module.exports = new UrlAnalyzer();
