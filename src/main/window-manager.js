const { BrowserWindow, Menu, Tray, nativeImage, app, shell } = require('electron');
const path = require('path');

class WindowManager {
    constructor() {
        this.mainWindow = null;
        this.splashWindow = null;
        this.tray = null;
        this.hasShownTrayBalloon = false;
    }

    createSplashWindow() {
        this.splashWindow = new BrowserWindow({
            width: 480,
            height: 360,
            frame: false,
            resizable: false,
            alwaysOnTop: true,
            center: true,
            transparent: true,
            backgroundColor: '#00000000',
            webPreferences: {
                preload: path.join(__dirname, '..', 'preload', 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        this.splashWindow.loadFile(path.join(__dirname, '..', 'renderer', 'splash.html'));

        return this.splashWindow;
    }

    createMainWindow() {
        const iconPath = path.join(__dirname, '..', 'renderer', 'assets', 'icons', 'icon.png');
        const appIcon = nativeImage.createFromPath(iconPath);

        this.mainWindow = new BrowserWindow({
            width: 1280,
            height: 800,
            minWidth: 1024,
            minHeight: 680,
            show: false,
            title: 'YTDown Pro — Desktop Media Downloader & Converter',
            backgroundColor: '#f4f6fa',
            icon: appIcon.isEmpty() ? path.join(__dirname, '..', 'renderer', 'assets', 'icons', 'icon.ico') : appIcon,
            webPreferences: {
                preload: path.join(__dirname, '..', 'preload', 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false
            }
        });

        if (!appIcon.isEmpty()) {
            this.mainWindow.setIcon(appIcon);
        }

        this.mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

        // Build Application Native Menu
        this.buildMenu();

        // System Tray Integration
        this.buildSystemTray();

        // Intercept close event to keep app running in system tray
        this.mainWindow.on('close', (event) => {
            if (!app.isQuitting) {
                event.preventDefault();
                this.mainWindow.hide();

                if (this.tray && !this.hasShownTrayBalloon) {
                    this.hasShownTrayBalloon = true;
                    try {
                        this.tray.displayBalloon({
                            title: 'YTDown Pro Running in Background',
                            content: 'YTDown Pro is still active and downloading in the system tray.'
                        });
                    } catch (e) {}
                }
                return false;
            }
        });

        this.mainWindow.once('ready-to-show', () => {
            if (this.splashWindow && !this.splashWindow.isDestroyed()) {
                setTimeout(() => {
                    this.splashWindow.close();
                    this.mainWindow.show();
                    this.mainWindow.focus();
                }, 1200);
            } else {
                this.mainWindow.show();
            }
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        return this.mainWindow;
    }

    buildMenu() {
        const template = [
            {
                label: 'File',
                submenu: [
                    { 
                        label: 'New Download', 
                        accelerator: 'CmdOrCtrl+N', 
                        click: () => { 
                            if (this.mainWindow) { 
                                this.mainWindow.show(); 
                                this.mainWindow.focus(); 
                                this.mainWindow.webContents.send('nav:go', 'dashboard'); 
                            } 
                        } 
                    },
                    { type: 'separator' },
                    { 
                        label: 'Exit', 
                        click: () => { 
                            app.isQuitting = true; 
                            app.quit(); 
                        } 
                    }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { label: 'Dashboard', click: () => { if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); this.mainWindow.webContents.send('nav:go', 'dashboard'); } } },
                    { label: 'Downloads & Queue', click: () => { if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); this.mainWindow.webContents.send('nav:go', 'downloads'); } } },
                    { label: 'Download History', click: () => { if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); this.mainWindow.webContents.send('nav:go', 'history'); } } },
                    { label: 'Settings', click: () => { if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); this.mainWindow.webContents.send('nav:go', 'settings'); } } },
                    { type: 'separator' },
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' }
                ]
            },
            {
                label: 'Help',
                submenu: [
                    { label: 'Engine Diagnostics', click: () => { if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); this.mainWindow.webContents.send('nav:go', 'settings'); } } },
                    { label: 'Keyboard Shortcuts', click: () => { if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); this.mainWindow.webContents.send('modal:shortcuts'); } } },
                    { type: 'separator' },
                    { label: 'About YTDown Pro', click: () => { if (this.mainWindow) { this.mainWindow.show(); this.mainWindow.focus(); this.mainWindow.webContents.send('modal:about'); } } }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    buildSystemTray() {
        try {
            const downloadManager = require('./services/download-manager');
            const iconPath = path.join(__dirname, '..', 'renderer', 'assets', 'icons', 'icon.png');
            let icon = nativeImage.createFromPath(iconPath);
            if (icon.isEmpty()) {
                const icoPath = path.join(__dirname, '..', 'renderer', 'assets', 'icons', 'icon.ico');
                icon = nativeImage.createFromPath(icoPath);
            }
            this.tray = new Tray(icon);

            const updateContextMenu = () => {
                const activeJobs = downloadManager.getActiveJobs ? downloadManager.getActiveJobs() : [];
                const activeCount = activeJobs.length;
                const statusLabel = activeCount > 0 ? `⚡ Active Downloads (${activeCount})` : '🟢 Status: Ready & Monitoring';

                const contextMenu = Menu.buildFromTemplate([
                    { label: 'YTDown Pro v1.0.0', enabled: false },
                    { label: statusLabel, enabled: false },
                    { type: 'separator' },
                    { 
                        label: 'Open YTDown Pro', 
                        click: () => { 
                            if (this.mainWindow) { 
                                this.mainWindow.show(); 
                                this.mainWindow.focus(); 
                            } 
                        } 
                    },
                    { 
                        label: 'Pause All Downloads', 
                        click: () => downloadManager.pauseAllJobs() 
                    },
                    { 
                        label: 'Resume All Downloads', 
                        click: () => downloadManager.resumeAllJobs() 
                    },
                    { type: 'separator' },
                    { 
                        label: 'Downloads & Queue', 
                        click: () => { 
                            if (this.mainWindow) { 
                                this.mainWindow.show(); 
                                this.mainWindow.focus(); 
                                this.mainWindow.webContents.send('nav:go', 'downloads'); 
                            } 
                        } 
                    },
                    { 
                        label: 'Settings', 
                        click: () => { 
                            if (this.mainWindow) { 
                                this.mainWindow.show(); 
                                this.mainWindow.focus(); 
                                this.mainWindow.webContents.send('nav:go', 'settings'); 
                            } 
                        } 
                    },
                    { type: 'separator' },
                    { 
                        label: 'Quit YTDown Pro', 
                        click: () => { 
                            app.isQuitting = true; 
                            app.quit(); 
                        } 
                    }
                ]);
                this.tray.setContextMenu(contextMenu);
            };

            updateContextMenu();
            this.tray.setToolTip('YTDown Pro — Desktop Media Downloader & Background Engine');

            // Refresh menu on tray interaction
            this.tray.on('click', () => {
                updateContextMenu();
                if (this.mainWindow) {
                    if (this.mainWindow.isVisible()) {
                        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                        this.mainWindow.focus();
                    } else {
                        this.mainWindow.show();
                        this.mainWindow.focus();
                    }
                }
            });

            this.tray.on('double-click', () => {
                if (this.mainWindow) {
                    this.mainWindow.show();
                    this.mainWindow.focus();
                }
            });
        } catch (err) {
            console.log('Tray creation notice:', err.message);
        }
    }
}

module.exports = new WindowManager();
