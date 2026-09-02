class DashboardController {
    constructor() {
        this.currentMedia = null;
        this.selectedFormat = 'MP4';
        this.savePath = '';
        this.lastClipboardUrl = '';
        this.clipboardInterval = null;
    }

    async init() {
        this.bindEvents();
        await this.loadDefaultSavePath();
        this.startClipboardPoller();
    }

    startClipboardPoller() {
        // Initial check immediately
        this.checkClipboardForUrl();

        // Continuous 1-second background link refresher
        if (this.clipboardInterval) clearInterval(this.clipboardInterval);
        this.clipboardInterval = setInterval(() => {
            this.checkClipboardForUrl();
        }, 1000);
    }

    bindEvents() {
        const urlInput = document.getElementById('url-input');
        const btnPaste = document.getElementById('btn-paste');
        const btnClear = document.getElementById('btn-clear');
        const btnAnalyze = document.getElementById('btn-analyze');
        const btnChangeFolder = document.getElementById('btn-change-folder');
        const btnStartDownload = document.getElementById('btn-start-download');

        btnPaste.addEventListener('click', async () => {
            const text = await window.ytdown.readClipboard();
            if (text && text.trim()) {
                urlInput.value = text.trim();
                this.validateUrlInput();
            }
        });

        btnClear.addEventListener('click', () => {
            urlInput.value = '';
            this.resetDashboard();
        });

        urlInput.addEventListener('input', () => this.validateUrlInput());
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.analyzeCurrentUrl();
        });

        btnAnalyze.addEventListener('click', () => this.analyzeCurrentUrl());

        btnChangeFolder.addEventListener('click', async () => {
            const folder = await window.ytdown.selectFolder();
            if (folder) {
                this.savePath = folder;
                const savePath = document.getElementById('save-path-input');
                if (savePath.tagName === 'INPUT') savePath.value = folder;
                else savePath.textContent = folder;

                const rememberBox = document.getElementById('check-remember-folder');
                if (rememberBox && rememberBox.checked) {
                    await window.ytdown.updateSettings({ download_folder: folder });
                    window.app.showToast('Download location saved as default', 'success');
                }
            }
        });

        btnStartDownload.addEventListener('click', () => this.startDownload());

        // Clipboard dismiss
        const dismissBtn = document.getElementById('clipboard-dismiss-btn');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                const banner = document.getElementById('clipboard-banner');
                if (banner) banner.style.setProperty('display', 'none', 'important');
            });
        }

        // Downloads filter buttons (new dq-filter-btn)
        document.querySelectorAll('.dq-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.dq-filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const filter = e.currentTarget.getAttribute('data-filter');
                if (window.downloadsController) window.downloadsController.applyFilter(filter);
            });
        });

        // Go to Dashboard button in empty state
        const goDash = document.getElementById('btn-go-dashboard');
        if (goDash) {
            goDash.addEventListener('click', () => window.app && window.app.switchView('dashboard'));
        }

        // Format selection pills
        document.querySelectorAll('.format-card-option').forEach(el => {
            el.addEventListener('click', (e) => {
                document.querySelectorAll('.format-card-option').forEach(opt => opt.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.selectedFormat = e.currentTarget.getAttribute('data-fmt');
                this.updateQualityOptions();
            });
        });
    }

    async checkClipboardForUrl() {
        try {
            const clipboardText = (await window.ytdown.readClipboard() || '').trim();
            if (!clipboardText || (!clipboardText.startsWith('http://') && !clipboardText.startsWith('https://'))) return;

            // If same link as already processed, do nothing
            if (clipboardText === this.lastClipboardUrl) {
                return;
            }

            // Link is NEW! Update tracking variable
            this.lastClipboardUrl = clipboardText;

            const banner = document.getElementById('clipboard-banner');
            const bannerText = document.getElementById('clipboard-banner-text');
            const btnClipboardPaste = document.getElementById('clipboard-paste-btn');
            const metaTags = document.getElementById('clipboard-meta-tags');

            if (!banner || !bannerText) return;

            // Show trimmed URL
            const shortUrl = clipboardText.length > 55 ? clipboardText.substring(0, 55) + '…' : clipboardText;
            bannerText.textContent = shortUrl;

            // Build smart tags: Website, Type, Engine
            if (metaTags) {
                const tags = this.buildClipboardTags(clipboardText);
                metaTags.innerHTML = '';
                tags.forEach(tag => {
                    const span = document.createElement('span');
                    span.className = `clip-tag ${tag.cls}`;
                    span.textContent = tag.label;
                    metaTags.appendChild(span);
                });
            }

            // Show banner with smooth bounce effect
            banner.style.setProperty('display', 'block', 'important');
            banner.classList.remove('animate-fade-in');
            void banner.offsetWidth;
            banner.classList.add('animate-fade-in');

            if (btnClipboardPaste) {
                btnClipboardPaste.onclick = () => {
                    const urlInput = document.getElementById('url-input');
                    if (urlInput) {
                        urlInput.value = clipboardText;
                        banner.style.setProperty('display', 'none', 'important');
                        this.validateUrlInput();
                        this.analyzeCurrentUrl();
                    }
                };
            }
        } catch (err) {}
    }

    buildClipboardTags(url) {
        const tags = [];
        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.replace('www.', '');

            // Site tag
            const siteName = this.getSiteName(hostname);
            tags.push({ label: `🌐 ${siteName}`, cls: 'tag-site' });

            // Type tag (based on extension or known platform)
            const ext = (parsed.pathname.match(/\.([a-z0-9]{2,6})(?:[?#]|$)/i) || [])[1];
            if (ext) {
                const typeMap = {
                    pdf:'📄 PDF Document', doc:'📝 Word Doc', docx:'📝 Word Doc',
                    zip:'📦 Archive', rar:'📦 Archive', '7z':'📦 Archive', tar:'📦 Archive',
                    exe:'⚙️ Software', msi:'⚙️ Software', apk:'📱 App', iso:'💿 Disk Image',
                    mp4:'🎬 Video', mkv:'🎬 Video', avi:'🎬 Video',
                    mp3:'🎵 Audio', wav:'🎵 Audio', flac:'🎵 Audio',
                    jpg:'🖼️ Image', png:'🖼️ Image', gif:'🖼️ Image', webp:'🖼️ Image'
                };
                tags.push({ label: typeMap[ext.toLowerCase()] || `📎 .${ext.toUpperCase()}`, cls: 'tag-type' });
                tags.push({ label: '⚡ Universal Engine', cls: 'tag-engine' });
            } else if (this.isMediaPlatformHostname(hostname)) {
                tags.push({ label: '🎬 Streaming Media', cls: 'tag-type' });
                tags.push({ label: '⚡ yt-dlp Engine', cls: 'tag-engine' });
            } else {
                tags.push({ label: '🔗 Direct Link', cls: 'tag-type' });
                tags.push({ label: '⚡ Auto Detect', cls: 'tag-engine' });
            }
        } catch (e) {}
        return tags;
    }

    getSiteName(hostname) {
        const map = { 'youtube.com':'YouTube','youtu.be':'YouTube','vimeo.com':'Vimeo','tiktok.com':'TikTok','instagram.com':'Instagram','twitter.com':'Twitter','x.com':'X (Twitter)','facebook.com':'Facebook','dailymotion.com':'Dailymotion','soundcloud.com':'SoundCloud','github.com':'GitHub','mega.nz':'MEGA','drive.google.com':'Google Drive' };
        return map[hostname] || hostname;
    }

    isMediaPlatformHostname(hostname) {
        return ['youtube.com','youtu.be','vimeo.com','tiktok.com','instagram.com','twitter.com','x.com','facebook.com','dailymotion.com','soundcloud.com'].includes(hostname);
    }

    validateUrlInput() {
        const urlInput = document.getElementById('url-input');
        const validationMsg = document.getElementById('url-validation-msg');
        const val = urlInput.value.trim();

        if (!val) {
            validationMsg.textContent = 'Enter URL to begin';
            validationMsg.className = 'url-status-msg';
            return false;
        }

        if (val.startsWith('http://') || val.startsWith('https://')) {
            validationMsg.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1 animate-pop"></i> Supported URL detected';
            validationMsg.className = 'url-status-msg is-valid';
            // Show live meta tags in analyzer header
            this.updateUrlLiveMeta(val);
            return true;
        } else {
            validationMsg.innerHTML = '<i class="bi bi-exclamation-triangle-fill text-danger me-1"></i> Invalid http/https URL';
            validationMsg.className = 'url-status-msg is-invalid';
            return false;
        }
    }

    updateUrlLiveMeta(url) {
        const metaContainer = document.getElementById('url-live-meta');
        if (!metaContainer) return;
        const tags = this.buildClipboardTags(url);
        metaContainer.innerHTML = '';
        tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = `clip-tag ${tag.cls}`;
            span.textContent = tag.label;
            metaContainer.appendChild(span);
        });
        metaContainer.style.display = 'flex';
    }

    async loadDefaultSavePath() {
        const settings = await window.ytdown.getSettings();
        if (settings && settings.download_folder) {
            this.savePath = settings.download_folder;
        }
        const savePath = document.getElementById('save-path-input');
        if (savePath) {
            const displayVal = this.savePath || 'Default Downloads Folder';
            if (savePath.tagName === 'INPUT') savePath.value = displayVal;
            else savePath.textContent = displayVal;
        }
    }

    async analyzeCurrentUrl() {
        const urlInput = document.getElementById('url-input');
        const url = urlInput.value.trim();

        if (!this.validateUrlInput()) {
            window.app.showToast('Please enter a valid media URL', 'warning');
            return;
        }

        this.showAnalyzeLoading(true);

        try {
            const media = await window.ytdown.analyzeUrl(url);
            this.currentMedia = media;

            // Check for duplicate downloads
            const existing = await window.ytdown.findExisting(url);
            if (existing) {
                window.app.showToast('Notice: This media was previously downloaded', 'info');
            }

            this.renderMediaCard(media);
            window.app.showToast('Media information analyzed!', 'success');
        } catch (err) {
            console.error('Analyze failed:', err);
            window.app.showToast(err.message || 'Failed to analyze URL', 'danger');
        } finally {
            this.showAnalyzeLoading(false);
        }
    }

    showAnalyzeLoading(isLoading) {
        const spinner = document.getElementById('analyze-spinner');
        const mediaCard = document.getElementById('media-card');
        const btnAnalyze = document.getElementById('btn-analyze');

        if (isLoading) {
            spinner.style.display = 'block';
            mediaCard.style.display = 'none';
            btnAnalyze.disabled = true;
        } else {
            spinner.style.display = 'none';
            btnAnalyze.disabled = false;
        }
    }

    renderMediaCard(media) {
        const mediaCard = document.getElementById('media-card');
        const mediaThumb = document.getElementById('media-thumb');
        const thumbContainer = mediaThumb.parentElement;

        if (media.type === 'direct_file') {
            // Direct File Category UI (RAR, ZIP, PDF, EXE, ISO, etc.)
            const category = media.category || 'Direct File';
            const ext = (media.extension || 'file').toUpperCase();
            const iconMap = {
                'Archives': 'bi-archive-fill text-warning',
                'Documents': 'bi-file-earmark-pdf-fill text-danger',
                'Software': 'bi-gear-wide-connected text-primary',
                'Images': 'bi-file-earmark-image-fill text-success',
                'Media': 'bi-film text-info',
                'General': 'bi-file-earmark-arrow-down-fill text-accent'
            };
            const categoryIcon = iconMap[category] || 'bi-file-earmark-arrow-down-fill text-primary';

            // Show Category Hero Box instead of Video Thumbnail
            let categoryHero = document.getElementById('media-category-hero');
            if (!categoryHero) {
                categoryHero = document.createElement('div');
                categoryHero.id = 'media-category-hero';
                categoryHero.className = 'w-100 d-flex flex-column align-items-center justify-content-center p-4 rounded-3 text-center border';
                categoryHero.style.cssText = 'aspect-ratio: 16/9; background: var(--surface-hover);';
                thumbContainer.appendChild(categoryHero);
            }
            categoryHero.innerHTML = `
                <i class="bi ${categoryIcon} display-4 mb-2"></i>
                <span class="badge bg-primary text-uppercase fs-6 px-3 py-1 mb-1">${ext} File</span>
                <span class="text-muted small">${category} Category</span>
            `;
            mediaThumb.style.display = 'none';
            categoryHero.style.display = 'flex';

            document.getElementById('media-duration').style.display = 'none';
            document.getElementById('media-title').textContent = media.filename || media.title || 'Direct File';
            document.getElementById('media-channel').textContent = `${category} File • ${this.formatBytes(media.filesize || 0)}`;
            document.getElementById('media-domain').textContent = 'Direct Web Link';
            const engineBadge = document.getElementById('media-engine-badge');
            if (engineBadge) engineBadge.textContent = '⚡ Universal Downloader Engine';

            // Dynamically render format pills for Direct File
            this.selectedFormat = ext;
            this.renderFormatOptions([
                { fmt: ext, label: `${ext} File` }
            ]);

        } else {
            // Media Stream UI (YouTube, Vimeo, etc.)
            if (document.getElementById('media-category-hero')) {
                document.getElementById('media-category-hero').style.display = 'none';
            }
            mediaThumb.style.display = 'block';
            mediaThumb.src = media.thumbnail || '';
            document.getElementById('media-duration').style.display = 'block';
            document.getElementById('media-duration').textContent = media.duration || '00:00';
            document.getElementById('media-title').textContent = media.title || 'Untitled Media';
            document.getElementById('media-channel').textContent = media.uploader || 'Unknown';
            document.getElementById('media-domain').textContent = this.getSiteName(new URL(media.url || 'http://dummy.com').hostname.replace('www.', ''));
            const engineBadge = document.getElementById('media-engine-badge');
            if (engineBadge) engineBadge.textContent = '⚡ yt-dlp + FFmpeg Engine';

            this.selectedFormat = 'MP4';
            this.renderFormatOptions([
                { fmt: 'MP4', label: 'MP4' },
                { fmt: 'WEBM', label: 'WEBM' },
                { fmt: 'MP3', label: 'MP3' },
                { fmt: 'M4A', label: 'M4A' }
            ]);
        }

        this.updateQualityOptions();
        mediaCard.style.display = 'block';
        mediaCard.classList.remove('animate-fade-in');
        void mediaCard.offsetWidth;
        mediaCard.classList.add('animate-fade-in');
        mediaCard.scrollIntoView({ behavior: 'smooth' });
    }

    renderFormatOptions(optionsList) {
        const container = document.getElementById('format-options');
        container.innerHTML = '';
        optionsList.forEach((opt, idx) => {
            const div = document.createElement('div');
            div.className = `format-card-option ${idx === 0 ? 'active' : ''}`;
            div.setAttribute('data-fmt', opt.fmt);
            div.textContent = opt.label;
            div.onclick = (e) => {
                document.querySelectorAll('.format-card-option').forEach(o => o.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.selectedFormat = opt.fmt;
                this.updateQualityOptions();
            };
            container.appendChild(div);
        });
    }

    formatBytes(bytes) {
        if (!bytes || bytes <= 0) return 'Size Unknown';
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
    }

    updateQualityOptions() {
        const qualitySelect = document.getElementById('quality-select');
        qualitySelect.innerHTML = '';

        if (this.currentMedia && this.currentMedia.type === 'direct_file') {
            const opt = document.createElement('option');
            opt.value = 'original';
            const sizeStr = this.formatBytes(this.currentMedia.filesize);
            opt.textContent = `Original File Quality (${sizeStr})`;
            qualitySelect.appendChild(opt);
            return;
        }

        const isAudio = ['MP3', 'M4A', 'WAV', 'FLAC'].includes(this.selectedFormat);
        if (isAudio) {
            const audioBitrates = ['320 kbps', '256 kbps', '192 kbps', '128 kbps'];
            audioBitrates.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                opt.textContent = `${b} High Quality Audio`;
                qualitySelect.appendChild(opt);
            });
        } else {
            const videoQualities = (this.currentMedia && Array.isArray(this.currentMedia.videoQualities) && this.currentMedia.videoQualities.length > 0)
                ? this.currentMedia.videoQualities
                : ['1080p', '720p', '480p', '360p'];

            videoQualities.forEach(q => {
                const opt = document.createElement('option');
                opt.value = q;
                opt.textContent = `${q} ${q === '1080p' ? 'Full HD (Recommended)' : ''}`;
                qualitySelect.appendChild(opt);
            });
        }
    }

    async startDownload() {
        if (!this.currentMedia) return;

        const qualitySelect = document.getElementById('quality-select');
        const quality = qualitySelect.value;
        const btnStartDownload = document.getElementById('btn-start-download');

        btnStartDownload.disabled = true;
        btnStartDownload.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Adding to queue...';

        try {
            const jobInput = {
                url: this.currentMedia.url,
                title: this.currentMedia.title,
                filename: this.currentMedia.filename || this.currentMedia.title,
                thumbnail: this.currentMedia.thumbnail || '',
                format: this.selectedFormat,
                quality: quality,
                audioQuality: quality,
                outputDirectory: this.savePath,
                engine: this.currentMedia.engine || 'ytdlp',
                type: this.currentMedia.type || 'media_stream',
                category: this.currentMedia.category || 'Media'
            };

            await window.ytdown.startDownload(jobInput);
            window.app.showToast('Download started! Added to queue.', 'success');

            // Switch view to Downloads
            window.app.switchView('downloads');

        } catch (err) {
            window.app.showToast(err.message || 'Failed to start download', 'danger');
        } finally {
            btnStartDownload.disabled = false;
            btnStartDownload.innerHTML = '<i class="bi bi-download fs-5 me-2"></i> Download Now';
        }
    }

    resetDashboard() {
        this.currentMedia = null;
        document.getElementById('media-card').style.display = 'none';
        document.getElementById('analyze-spinner').style.display = 'none';
        this.validateUrlInput();
    }
}

window.dashboardController = new DashboardController();
