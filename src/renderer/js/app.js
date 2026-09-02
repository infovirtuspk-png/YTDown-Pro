class App {
    constructor() {
        this.currentView = 'dashboard';
    }

    async init() {
        // 1. Initialize i18n
        const settings = await window.ytdown.getSettings();
        const initialLang = (settings && settings.language) ? settings.language : 'en';
        const initialTheme = (settings && settings.theme) ? settings.theme : 'light';

        await window.i18n.init(initialLang);
        this.applyTheme(initialTheme);

        // 2. Bind Sidebar Navigation
        this.bindNavigation();

        // 3. Initialize View Controllers
        window.dashboardController.init();
        window.downloadsController.init();
        window.historyController.init();
        window.settingsController.init();

        // 4. Setup Shortcuts & Main IPC Listeners
        this.setupKeyboardShortcuts();
        this.setupIpcListeners();
    }

    bindNavigation() {
        const navBtns = document.querySelectorAll('.nav-item-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');
                this.switchView(target);
            });
        });

        // Sidebar collapse toggle
        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });

        // Theme toggle quick button
        const themeBtn = document.getElementById('theme-toggle-btn');
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.applyTheme(nextTheme);
            window.ytdown.updateSettings({ theme: nextTheme });
        });
    }

    switchView(targetView) {
        this.currentView = targetView;

        // Hide all view panels
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        // Show target panel
        const activePanel = document.getElementById(`view-${targetView}`);
        if (activePanel) {
            activePanel.style.display = 'block';
            activePanel.classList.remove('animate-fade-in');
            void activePanel.offsetWidth; // trigger reflow
            activePanel.classList.add('animate-fade-in');
        }

        // Update nav active button
        document.querySelectorAll('.nav-item-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-target') === targetView) {
                btn.classList.add('active');
            }
        });

        // Update page title
        const titleEl = document.getElementById('page-title');
        titleEl.textContent = window.i18n.t(targetView, targetView.toUpperCase());

        // Refresh views on navigate
        if (targetView === 'downloads') {
            window.downloadsController.refreshDownloadsList();
        } else if (targetView === 'history') {
            window.historyController.loadHistory();
        }
    }

    applyTheme(theme) {
        let activeTheme = theme;
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            activeTheme = prefersDark ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', activeTheme);
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.className = activeTheme === 'dark' ? 'bi bi-moon-stars' : 'bi bi-sun';
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + L -> Focus URL Input
            if (e.ctrlKey && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                this.switchView('dashboard');
                const urlInput = document.getElementById('url-input');
                if (urlInput) urlInput.focus();
            }
            // Ctrl + , -> Settings
            else if (e.ctrlKey && e.key === ',') {
                e.preventDefault();
                this.switchView('settings');
            }
        });
    }

    setupIpcListeners() {
        window.ytdown.onNavigation((target) => {
            this.switchView(target);
        });

        window.ytdown.onAboutTrigger(() => {
            this.switchView('about');
        });

        window.ytdown.onExtensionUrlReceived((payload) => {
            this.switchView('dashboard');
            const urlInput = document.getElementById('url-input');
            if (urlInput && payload.url) {
                urlInput.value = payload.url;
                this.showToast('⚡ Link captured from Chrome Extension!', 'success');
                if (window.dashboardController) {
                    window.dashboardController.validateUrlInput();
                    window.dashboardController.analyzeCurrentUrl();
                }
            }
        });

        const showCertModal = () => {
            const certModal = new bootstrap.Modal(document.getElementById('certificateModal'));
            certModal.show();
        };

        const btnOpenCert = document.getElementById('btn-open-certificate');
        if (btnOpenCert) btnOpenCert.addEventListener('click', showCertModal);

        const certImgCard = document.getElementById('cert-img-card');
        if (certImgCard) certImgCard.addEventListener('click', showCertModal);

        const btnCertFullscreen = document.getElementById('btn-cert-fullscreen');
        if (btnCertFullscreen) btnCertFullscreen.addEventListener('click', (e) => { e.stopPropagation(); showCertModal(); });

        const btnCopyEmail = document.getElementById('btn-copy-email');
        if (btnCopyEmail) {
            btnCopyEmail.addEventListener('click', () => {
                navigator.clipboard.writeText('info.virtuspk@gmail.com');
                this.showToast('Developer email copied to clipboard!', 'success');
            });
        }
    }

    showToast(message, type = 'info') {
        const host = document.getElementById('toast-host');
        if (!host) return;

        const toast = document.createElement('div');
        toast.className = 'toast-custom animate-fade-in';

        let iconClass = 'bi-info-circle text-info';
        if (type === 'success') iconClass = 'bi-check-circle text-success';
        else if (type === 'danger') iconClass = 'bi-exclamation-octagon text-danger';
        else if (type === 'warning') iconClass = 'bi-exclamation-triangle text-warning';

        toast.innerHTML = `
            <i class="bi ${iconClass} fs-5"></i>
            <span>${message}</span>
            <button type="button" class="btn-close btn-close-white ms-auto"></button>
        `;

        // Attach close button event listener without inline handler (CSP compliance)
        const closeBtn = toast.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => toast.remove());
        }

        host.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('animate-fade-out');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
});
