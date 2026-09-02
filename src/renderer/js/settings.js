class SettingsController {
    async init() {
        this.bindEvents();
        await this.loadSettings();
        await this.runEngineDiagnostics();
    }

    bindEvents() {
        const themeSelect = document.getElementById('setting-theme');
        const langSelect = document.getElementById('setting-language');
        const concurrentSelect = document.getElementById('setting-concurrent');
        const notifCheck = document.getElementById('setting-notifications');
        const btnTestEngine = document.getElementById('btn-test-engine');

        themeSelect.addEventListener('change', async () => {
            const val = themeSelect.value;
            window.app.applyTheme(val);
            await window.ytdown.updateSettings({ theme: val });
        });

        langSelect.addEventListener('change', async () => {
            const val = langSelect.value;
            await window.i18n.setLanguage(val);
            await window.ytdown.updateSettings({ language: val });
        });

        concurrentSelect.addEventListener('change', async () => {
            await window.ytdown.updateSettings({ max_concurrent: concurrentSelect.value });
            window.app.showToast('Concurrency settings updated', 'success');
        });

        notifCheck.addEventListener('change', async () => {
            await window.ytdown.updateSettings({ notifications: String(notifCheck.checked) });
        });

        btnTestEngine.addEventListener('click', () => this.runEngineDiagnostics());

        const btnOpenExtFolder = document.getElementById('btn-open-extension-folder');
        if (btnOpenExtFolder) {
            btnOpenExtFolder.addEventListener('click', async () => {
                await window.ytdown.openExtensionFolder();
                window.app.showToast('Opened Chrome Extension directory', 'info');
            });
        }
    }

    async loadSettings() {
        try {
            const settings = await window.ytdown.getSettings();
            if (settings) {
                if (settings.theme) document.getElementById('setting-theme').value = settings.theme;
                if (settings.language) document.getElementById('setting-language').value = settings.language;
                if (settings.max_concurrent) document.getElementById('setting-concurrent').value = settings.max_concurrent;
                if (settings.notifications !== undefined) {
                    document.getElementById('setting-notifications').checked = (settings.notifications === 'true');
                }
            }
        } catch (err) {
            console.error('Failed loading settings:', err);
        }
    }

    async runEngineDiagnostics() {
        const btnTest = document.getElementById('btn-test-engine');
        btnTest.disabled = true;
        btnTest.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Testing...';

        try {
            const diag = await window.ytdown.getEngineStatus();
            
            // yt-dlp status
            const ytdlpVer = document.getElementById('diag-ytdlp-ver');
            const ytdlpStatus = document.getElementById('diag-ytdlp-status');
            if (ytdlpVer && ytdlpStatus) {
                ytdlpVer.textContent = diag.ytdlp.version || 'Not Found';
                ytdlpStatus.textContent = diag.ytdlp.status;
                ytdlpStatus.className = `badge ${diag.ytdlp.status === 'READY' ? 'bg-success' : 'bg-danger'}`;
            }

            // FFmpeg status
            const ffmpegVer = document.getElementById('diag-ffmpeg-ver');
            const ffmpegStatus = document.getElementById('diag-ffmpeg-status');
            if (ffmpegVer && ffmpegStatus) {
                ffmpegVer.textContent = diag.ffmpeg.version || 'Not Found';
                ffmpegStatus.textContent = diag.ffmpeg.status;
                ffmpegStatus.className = `badge ${diag.ffmpeg.status === 'READY' ? 'bg-success' : 'bg-danger'}`;
            }

            // FFprobe status
            const ffprobeVer = document.getElementById('diag-ffprobe-ver');
            const ffprobeStatus = document.getElementById('diag-ffprobe-status');
            if (ffprobeVer && ffprobeStatus) {
                ffprobeVer.textContent = diag.ffprobe.version || 'Not Found';
                ffprobeStatus.textContent = diag.ffprobe.status;
                ffprobeStatus.className = `badge ${diag.ffprobe.status === 'READY' ? 'bg-success' : 'bg-danger'}`;
            }

            // Update top bar engine badge
            const isAllReady = (diag.ytdlp.status === 'READY' && diag.ffmpeg.status === 'READY');
            const statusLabel = document.getElementById('engine-status-label');
            const statusDot = document.getElementById('engine-status-dot');

            if (statusLabel && statusDot) {
                statusLabel.textContent = isAllReady ? 'Engine: Ready' : 'Engine: Attention Required';
                statusDot.className = `spinner-grow spinner-grow-sm ${isAllReady ? 'text-success' : 'text-warning'}`;
            }

            window.app.showToast('Engine diagnostic test completed', 'info');

        } catch (err) {
            console.error('Diagnostic check failed:', err);
        } finally {
            btnTest.disabled = false;
            btnTest.innerHTML = '<i class="bi bi-arrow-repeat"></i> Test Engine';
        }
    }
}

window.settingsController = new SettingsController();
