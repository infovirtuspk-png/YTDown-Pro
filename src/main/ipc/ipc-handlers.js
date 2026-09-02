const { ipcMain, clipboard, shell, app } = require('electron');
const path = require('path');
const ytDlpService = require('../services/yt-dlp-service');
const urlAnalyzer = require('../services/url-analyzer');
const downloadManager = require('../services/download-manager');
const fileService = require('../services/file-service');
const engineManager = require('../services/engine-manager');
const downloadsRepo = require('../../database/repositories/downloads-repository');
const settingsRepo = require('../../database/repositories/settings-repository');

function setupIpcHandlers(mainWindow) {
    // Smart URL & Metadata Analysis (yt-dlp + Universal File Downloader routing)
    ipcMain.handle('ytdown:analyze-url', async (event, url) => {
        if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL parameter');
        }
        return urlAnalyzer.analyze(url);
    });

    // Start download
    ipcMain.handle('ytdown:start-download', async (event, jobInput) => {
        if (!jobInput || !jobInput.url) {
            throw new Error('Missing download job parameters');
        }
        return downloadManager.addJob(jobInput);
    });

    // Pause download
    ipcMain.handle('ytdown:pause-download', async (event, jobUuid) => {
        return downloadManager.pauseJob(jobUuid);
    });

    // Resume download
    ipcMain.handle('ytdown:resume-download', async (event, jobUuid) => {
        return downloadManager.resumeJob(jobUuid);
    });

    // Cancel download
    ipcMain.handle('ytdown:cancel-download', async (event, jobUuid) => {
        return downloadManager.cancelJob(jobUuid);
    });

    // Delete download (with optional file removal)
    ipcMain.handle('ytdown:delete-download', async (event, { jobUuid, deleteFile }) => {
        return downloadManager.deleteJob(jobUuid, deleteFile);
    });

    // Pause all downloads
    ipcMain.handle('ytdown:pause-all-downloads', async () => {
        return downloadManager.pauseAllJobs();
    });

    // Resume all downloads
    ipcMain.handle('ytdown:resume-all-downloads', async () => {
        return downloadManager.resumeAllJobs();
    });

    // Clear completed downloads
    ipcMain.handle('ytdown:clear-completed-downloads', async () => {
        return downloadManager.clearCompleted();
    });

    // Query downloads & history
    ipcMain.handle('ytdown:get-downloads', async () => {
        return downloadsRepo.getAllDownloads();
    });

    ipcMain.handle('ytdown:get-history', async (event, { filter, search }) => {
        return downloadsRepo.getHistory(filter || 'all', search || '');
    });

    ipcMain.handle('ytdown:clear-history', async () => {
        return downloadsRepo.clearHistory();
    });

    ipcMain.handle('ytdown:delete-history-item', async (event, jobUuid) => {
        return downloadsRepo.deleteJob(jobUuid);
    });

    ipcMain.handle('ytdown:find-existing', async (event, url) => {
        return downloadsRepo.findExistingDownload(url);
    });

    // Native file system integration
    ipcMain.handle('ytdown:select-folder', async () => {
        return fileService.selectFolder(mainWindow);
    });

    ipcMain.handle('ytdown:open-file', async (event, filePath) => {
        return fileService.openFile(filePath);
    });

    ipcMain.handle('ytdown:open-folder', async (event, filePath) => {
        return fileService.openFolder(filePath);
    });

    // Settings management
    ipcMain.handle('ytdown:get-settings', async () => {
        return settingsRepo.getAll();
    });

    ipcMain.handle('ytdown:update-settings', async (event, settingsObj) => {
        return settingsRepo.updateMultiple(settingsObj);
    });

    // Engine status & diagnostics
    ipcMain.handle('ytdown:get-engine-status', async () => {
        return engineManager.getDiagnostics();
    });

    // Helper: read clipboard text
    ipcMain.handle('ytdown:read-clipboard', async () => {
        return clipboard.readText();
    });

    // Extension Folder IPC
    ipcMain.handle('ytdown:open-extension-folder', async () => {
        let extensionPath;
        if (app && app.isPackaged) {
            extensionPath = path.join(process.resourcesPath, 'extension');
        } else {
            extensionPath = path.join(__dirname, '..', '..', '..', 'extension');
        }

        if (require('fs').existsSync(extensionPath)) {
            shell.openPath(extensionPath);
            return { success: true, path: extensionPath };
        } else {
            const fallbackPath = path.join(process.resourcesPath, 'extension');
            shell.openPath(fallbackPath);
            return { success: true, path: fallbackPath };
        }
    });
}

module.exports = { setupIpcHandlers };
