const { app, BrowserWindow } = require('electron');
const path = require('path');
const db = require('../database/database');
const windowManager = require('./window-manager');
const { setupIpcHandlers } = require('./ipc/ipc-handlers');
const downloadManager = require('./services/download-manager');
const engineManager = require('./services/engine-manager');
const extensionServer = require('./services/extension-server');

// Handle single instance lock & protocol URL triggers
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
} else {
    app.on('second-instance', (event, commandLine) => {
        if (windowManager.mainWindow) {
            if (windowManager.mainWindow.isMinimized()) windowManager.mainWindow.restore();
            windowManager.mainWindow.focus();

            // Check for ytdownpro:// protocol link in commandline
            const protoUrl = commandLine.find(arg => arg.startsWith('ytdownpro://'));
            if (protoUrl) {
                extensionServer.handleProtocolUrl(protoUrl);
            }
        }
    });
}

app.whenReady().then(async () => {
    try {
        // 1. Initialize SQLite Database
        const dbPath = path.join(app.getPath('userData'), 'database', 'ytdownpro.db');
        await db.initialize(dbPath);
        console.log('[✓] SQLite Database initialized at:', dbPath);

        // 2. Create Splash Window
        windowManager.createSplashWindow();

        // 3. Detect Engine Binaries
        const diagnostics = await engineManager.getDiagnostics();
        console.log('[✓] Engine Status:', diagnostics);

        // 4. Create Main Window
        const mainWindow = windowManager.createMainWindow();
        downloadManager.setMainWindow(mainWindow);

        // 5. Setup IPC Listeners
        setupIpcHandlers(mainWindow);

        // 6. Launch Chrome Extension Companion Server
        extensionServer.init(mainWindow, downloadManager);

    } catch (err) {
        console.error('Fatal initialization error:', err);
    }
});

app.on('window-all-closed', (event) => {
    // Keep app running in background system tray unless explicitly quitting
    if (!app.isQuitting) {
        event.preventDefault();
    } else {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow();
    }
});
