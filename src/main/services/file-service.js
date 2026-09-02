const { dialog, shell, app } = require('electron');
const path = require('path');
const fs = require('fs');

class FileService {
    getDefaultDownloadFolder() {
        return app.getPath('downloads');
    }

    async selectFolder(browserWindow) {
        const result = await dialog.showOpenDialog(browserWindow, {
            title: 'Select Save Location',
            defaultPath: this.getDefaultDownloadFolder(),
            properties: ['openDirectory', 'createDirectory']
        });

        if (result.canceled || !result.filePaths.length) {
            return null;
        }

        return result.filePaths[0];
    }

    sanitizeFilename(name) {
        if (!name) return 'media_file';
        // Strip illegal Windows characters: \ / : * ? " < > |
        return name
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async openFile(filePath) {
        if (!filePath) {
            throw new Error('File path is empty');
        }

        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                await shell.openPath(filePath);
                return { success: true, isDir: true };
            }
            const res = await shell.openPath(filePath);
            if (res) {
                // If shell failed to open (e.g., no default app), open container folder
                const dir = path.dirname(filePath);
                if (fs.existsSync(dir)) await shell.openPath(dir);
            }
            return { success: true };
        }

        // If file missing on disk, try opening its directory
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir)) {
            await shell.openPath(dir);
            throw new Error('File was moved or deleted. Opened download folder instead.');
        }

        throw new Error('File does not exist on disk or was moved.');
    }

    async openFolder(filePath) {
        if (!filePath) {
            const defaultFolder = this.getDefaultDownloadFolder();
            return shell.openPath(defaultFolder);
        }

        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                return shell.openPath(filePath);
            }
            return shell.showItemInFolder(filePath);
        } else {
            const dir = path.dirname(filePath);
            if (fs.existsSync(dir)) {
                return shell.openPath(dir);
            } else {
                return shell.openPath(this.getDefaultDownloadFolder());
            }
        }
    }
}

module.exports = new FileService();
