const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ytdown', {
    // Media & Downloads
    analyzeUrl: (url) => ipcRenderer.invoke('ytdown:analyze-url', url),
    startDownload: (jobInput) => ipcRenderer.invoke('ytdown:start-download', jobInput),
    pauseDownload: (jobUuid) => ipcRenderer.invoke('ytdown:pause-download', jobUuid),
    resumeDownload: (jobUuid) => ipcRenderer.invoke('ytdown:resume-download', jobUuid),
    cancelDownload: (jobUuid) => ipcRenderer.invoke('ytdown:cancel-download', jobUuid),
    deleteDownload: (jobUuid, deleteFile) => ipcRenderer.invoke('ytdown:delete-download', { jobUuid, deleteFile }),
    pauseAllDownloads: () => ipcRenderer.invoke('ytdown:pause-all-downloads'),
    resumeAllDownloads: () => ipcRenderer.invoke('ytdown:resume-all-downloads'),
    clearCompletedDownloads: () => ipcRenderer.invoke('ytdown:clear-completed-downloads'),
    getDownloads: () => ipcRenderer.invoke('ytdown:get-downloads'),
    getHistory: (params) => ipcRenderer.invoke('ytdown:get-history', params || {}),
    clearHistory: () => ipcRenderer.invoke('ytdown:clear-history'),
    deleteHistoryItem: (jobUuid) => ipcRenderer.invoke('ytdown:delete-history-item', jobUuid),
    findExisting: (url) => ipcRenderer.invoke('ytdown:find-existing', url),

    // File System
    selectFolder: () => ipcRenderer.invoke('ytdown:select-folder'),
    openFile: (filePath) => ipcRenderer.invoke('ytdown:open-file', filePath),
    openFolder: (filePath) => ipcRenderer.invoke('ytdown:open-folder', filePath),

    // Settings & Engine
    getSettings: () => ipcRenderer.invoke('ytdown:get-settings'),
    updateSettings: (settingsObj) => ipcRenderer.invoke('ytdown:update-settings', settingsObj),
    getEngineStatus: () => ipcRenderer.invoke('ytdown:get-engine-status'),
    readClipboard: () => ipcRenderer.invoke('ytdown:read-clipboard'),

    // Event Listeners (Main -> Renderer)
    onDownloadCreated: (callback) => ipcRenderer.on('download:created', (e, val) => callback(val)),
    onDownloadProgress: (callback) => ipcRenderer.on('download:progress', (e, val) => callback(val)),
    onDownloadUpdated: (callback) => ipcRenderer.on('download:updated', (e, val) => callback(val)),
    onDownloadPaused: (callback) => ipcRenderer.on('download:paused', (e, val) => callback(val)),
    onDownloadResumed: (callback) => ipcRenderer.on('download:resumed', (e, val) => callback(val)),
    onDownloadCompleted: (callback) => ipcRenderer.on('download:completed', (e, val) => callback(val)),
    onDownloadFailed: (callback) => ipcRenderer.on('download:failed', (e, val) => callback(val)),
    onDownloadCancelled: (callback) => ipcRenderer.on('download:cancelled', (e, val) => callback(val)),
    onDownloadDeleted: (callback) => ipcRenderer.on('download:deleted', (e, val) => callback(val)),
    onDownloadClearedCompleted: (callback) => ipcRenderer.on('download:cleared-completed', (e, val) => callback(val)),
    onDownloadQueuePaused: (callback) => ipcRenderer.on('download:queue-paused', (e, val) => callback(val)),
    onDownloadQueueResumed: (callback) => ipcRenderer.on('download:queue-resumed', (e, val) => callback(val)),
    onNavigation: (callback) => ipcRenderer.on('nav:go', (e, target) => callback(target)),
    onModalTrigger: (callback) => ipcRenderer.on('modal:shortcuts', (e) => callback('shortcuts')),
    onAboutTrigger: (callback) => ipcRenderer.on('modal:about', (e) => callback('about')),
    onExtensionUrlReceived: (callback) => ipcRenderer.on('extension:url-received', (e, val) => callback(val)),
    openExtensionFolder: () => ipcRenderer.invoke('ytdown:open-extension-folder')
});
