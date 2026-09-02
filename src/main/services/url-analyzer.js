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
                    videoQualities: ytInfo.videoQualities,
                    audioFormats: ytInfo.audioFormats,
                    url: cleanUrl
                };
            } catch (ytErr) {
                console.warn('yt-dlp primary analysis failed for media platform URL, attempting probe fallback:', ytErr.message);
            }
        }

        // 2. Perform HTTP probe request to detect Content-Type & File details
        let headInfo = null;
        try {
            headInfo = await this.probeUrl(cleanUrl);
        } catch (err) {
            console.warn('Probe request failed:', err.message);
        }

        // 3. If probe succeeded and Content-Type indicates HTML or video stream page, try yt-dlp
        if (headInfo && headInfo.contentType && headInfo.contentType.includes('text/html')) {
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
                    videoQualities: ytInfo.videoQualities,
                    audioFormats: ytInfo.audioFormats,
                    url: cleanUrl
                };
            } catch (e) {
                // Fallthrough to direct file analysis
            }
        }

        // 4. Construct direct file info from probe or URL path fallback
        const filename = (headInfo && headInfo.filename) ? headInfo.filename : this.extractFilenameFromUrl(cleanUrl);
        const contentType = (headInfo && headInfo.contentType) ? headInfo.contentType : 'application/octet-stream';
        const contentLength = (headInfo && headInfo.contentLength) ? headInfo.contentLength : 0;
        const ext = this.extractExtension(filename || cleanUrl);
        const category = this.detectCategory(contentType, filename || cleanUrl);

        return {
            engine: 'universal',
            type: 'direct_file',
            category: category,
            title: filename,
            filename: filename,
            filesize: contentLength,
            contentType: contentType,
            extension: ext,
            url: cleanUrl,
            formats: [{
                format_id: ext,
                ext: ext,
                resolution: `${category} File`,
                filesize: contentLength,
                note: `Direct ${category} Download`
            }]
        };
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

    probeUrl(urlStr, redirectCount = 0) {
        return new Promise((resolve, reject) => {
            if (redirectCount > 5) {
                return reject(new Error('Too many HTTP redirects during analysis'));
            }

            let parsed;
            try {
                parsed = new URL(urlStr);
            } catch (e) {
                return reject(new Error('Invalid URL structure'));
            }

            const client = parsed.protocol === 'https:' ? https : http;
            const defaultHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'identity'
            };

            const options = {
                method: 'HEAD',
                headers: defaultHeaders,
                rejectUnauthorized: false,
                timeout: 5000
            };

            const executeRequest = (method) => {
                options.method = method;
                if (method === 'GET') {
                    options.headers = { ...defaultHeaders, 'Range': 'bytes=0-1024' };
                }

                const req = client.request(urlStr, options, (res) => {
                    // Handle HTTP redirects
                    if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                        try {
                            const nextUrl = new URL(res.headers.location, urlStr).href;
                            res.resume();
                            return resolve(this.probeUrl(nextUrl, redirectCount + 1));
                        } catch (e) {
                            // Ignore redirect error, continue with current response
                        }
                    }

                    // Fallback to GET if HEAD method is not allowed or rejected (405, 403, 400)
                    if (method === 'HEAD' && [400, 403, 405, 501].includes(res.statusCode)) {
                        res.resume();
                        return executeRequest('GET');
                    }

                    const contentType = res.headers['content-type'] || 'application/octet-stream';
                    let contentLength = parseInt(res.headers['content-length'] || '0', 10);

                    // Parse Content-Range header if GET with Range was used
                    if (!contentLength && res.headers['content-range']) {
                        const match = res.headers['content-range'].match(/\/(\d+)/);
                        if (match && match[1]) contentLength = parseInt(match[1], 10);
                    }

                    let filename = null;
                    const disposition = res.headers['content-disposition'];
                    if (disposition && disposition.includes('filename=')) {
                        const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
                        if (match && match[1]) filename = decodeURIComponent(match[1].trim());
                    }

                    res.resume();
                    resolve({
                        contentType,
                        contentLength,
                        filename,
                        statusCode: res.statusCode
                    });
                });

                req.on('error', (err) => {
                    // Fallback to GET if HEAD failed with socket error / ECONNRESET
                    if (method === 'HEAD') {
                        executeRequest('GET');
                    } else {
                        reject(err);
                    }
                });

                req.on('timeout', () => {
                    req.destroy();
                    if (method === 'HEAD') {
                        executeRequest('GET');
                    } else {
                        reject(new Error('URL probe timeout'));
                    }
                });

                req.end();
            };

            executeRequest('HEAD');
        });
    }

    extractFilenameFromUrl(urlStr) {
        try {
            const parsed = new URL(urlStr);
            let pathname = parsed.pathname;
            if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);
            const base = path.basename(pathname);
            if (base && base.includes('.')) {
                return decodeURIComponent(base);
            }
        } catch (e) {}
        const ext = this.extractExtension(urlStr);
        return `file_${Date.now()}.${ext}`;
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
        if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext) || contentType.includes('zip') || contentType.includes('compressed')) {
            return 'Archives';
        }
        // 4. Software
        if (['exe', 'msi', 'apk', 'dmg', 'iso', 'deb', 'rpm'].includes(ext)) {
            return 'Software';
        }
        // 5. Images
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext) || contentType.startsWith('image/')) {
            return 'Images';
        }

        return 'General';
    }

    extractExtension(filenameOrUrl) {
        try {
            const urlObj = new URL(filenameOrUrl.startsWith('http') ? filenameOrUrl : `http://dummy.com/${filenameOrUrl}`);
            const pathname = urlObj.pathname;
            const ext = path.extname(pathname).replace('.', '');
            return ext ? ext.toLowerCase() : 'download';
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
