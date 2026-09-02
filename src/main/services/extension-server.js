const http = require('http');
const { URL } = require('url');
const { app, shell } = require('electron');
const path = require('path');

class ExtensionServer {
    constructor() {
        this.port = 18492;
        this.server = null;
        this.mainWindow = null;
        this.downloadManager = null;
    }

    init(mainWindow, downloadManager) {
        this.mainWindow = mainWindow;
        this.downloadManager = downloadManager;

        // Register ytdownpro:// protocol handler
        if (!app.isDefaultProtocolClient('ytdownpro')) {
            app.setAsDefaultProtocolClient('ytdownpro');
            console.log('[✓] Registered ytdownpro:// custom protocol client');
        }

        this.startServer();
    }

    startServer() {
        this.server = http.createServer((req, res) => {
            // Enable CORS for Chrome Extension requests
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            const reqUrl = new URL(req.url, `http://localhost:${this.port}`);

            // API Endpoint: Extension Heartbeat / Status
            if (reqUrl.pathname === '/api/status' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'online',
                    app: 'YTDown Pro',
                    version: '1.0.0',
                    port: this.port
                }));
                return;
            }

            // API Endpoint: Receive Download Request from Chrome Extension
            if (reqUrl.pathname === '/api/download' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', async () => {
                    try {
                        const payload = JSON.parse(body);
                        const { url, quality = '1080p', format = 'mp4' } = payload;

                        if (!url) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'URL is required' }));
                            return;
                        }

                        console.log(`[Extension API] Received download request: ${url} (${format}, ${quality})`);

                        // Focus main window
                        if (this.mainWindow) {
                            if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                            this.mainWindow.show();
                            this.mainWindow.focus();

                            // Send URL to renderer for immediate auto-analysis or quick download
                            this.mainWindow.webContents.send('extension:url-received', { url, quality, format });
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'URL received by YTDown Pro' }));
                    } catch (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: err.message }));
                    }
                });
                return;
            }

            // API Endpoint: Open Extension Folder
            if (reqUrl.pathname === '/api/open-extension-folder' && req.method === 'POST') {
                const extensionPath = path.join(__dirname, '..', '..', '..', 'extension');
                shell.openPath(extensionPath);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, path: extensionPath }));
                return;
            }

            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
        });

        this.server.listen(this.port, '127.0.0.1', () => {
            console.log(`[✓] YTDown Pro Extension Local API Server running on http://127.0.0.1:${this.port}`);
        });

        this.server.on('error', (err) => {
            console.error('[!] Extension Server Error:', err);
        });
    }

    handleProtocolUrl(urlStr) {
        try {
            if (!urlStr || !urlStr.startsWith('ytdownpro://')) return;
            const parsed = new URL(urlStr);
            const targetUrl = parsed.searchParams.get('url');

            if (targetUrl && this.mainWindow) {
                if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                this.mainWindow.show();
                this.mainWindow.focus();
                this.mainWindow.webContents.send('extension:url-received', { url: targetUrl });
            }
        } catch (err) {
            console.error('Protocol URL handling failed:', err);
        }
    }
}

module.exports = new ExtensionServer();
