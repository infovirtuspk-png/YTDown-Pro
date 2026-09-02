class HistoryController {
    constructor() {
        this.historyItems = [];
    }

    async init() {
        this.bindEvents();
        await this.loadHistory();
        this.setupIpcListeners();
    }

    setupIpcListeners() {
        window.ytdown.onDownloadCompleted && window.ytdown.onDownloadCompleted(() => this.loadHistory());
        window.ytdown.onDownloadFailed && window.ytdown.onDownloadFailed(() => this.loadHistory());
        window.ytdown.onDownloadDeleted && window.ytdown.onDownloadDeleted(() => this.loadHistory());
        window.ytdown.onDownloadClearedCompleted && window.ytdown.onDownloadClearedCompleted(() => this.loadHistory());
    }

    bindEvents() {
        const searchInput = document.getElementById('history-search');
        const formatFilter = document.getElementById('history-format-filter');
        const btnClearHistory = document.getElementById('btn-clear-history');

        let debounceTimer;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => this.loadHistory(), 250);
            });
        }

        if (formatFilter) {
            formatFilter.addEventListener('change', () => this.loadHistory());
        }

        if (btnClearHistory) {
            btnClearHistory.addEventListener('click', async () => {
                if (confirm('Are you sure you want to clear your complete download history?')) {
                    await window.ytdown.clearHistory();
                    await this.loadHistory();
                    window.app.showToast('Download history cleared', 'info');
                }
            });
        }
    }

    async loadHistory() {
        const searchInput = document.getElementById('history-search');
        const formatFilter = document.getElementById('history-format-filter');

        const search = searchInput ? searchInput.value.trim() : '';
        const filter = formatFilter ? formatFilter.value : 'all';

        try {
            this.historyItems = await window.ytdown.getHistory({ filter, search });
            this.renderList();
        } catch (err) {
            console.error('Failed loading history:', err);
        }
    }

    renderList() {
        const container = document.getElementById('history-list-container');
        const emptyState = document.getElementById('history-empty-state');

        if (!this.historyItems || this.historyItems.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = this.historyItems.map(item => this.createHistoryCardHtml(item)).join('');

        this.bindCardActions();
    }

    createHistoryCardHtml(item) {
        const isCompleted = item.status === 'COMPLETED';
        const formattedDate = item.completed_at ? new Date(item.completed_at).toLocaleString() : '';
        const formattedSize = item.file_size ? this.formatBytes(item.file_size) : '';

        const badgeClass = isCompleted ? 'badge-completed' : 'badge-failed';
        const badgeIcon = isCompleted 
            ? '<i class="bi bi-check-circle-fill animate-pop me-1"></i>' 
            : '<i class="bi bi-x-circle me-1"></i>';

        const cardClass = isCompleted ? 'is-completed' : 'is-failed';

        return `
            <div class="download-card animate-fade-in hover-lift ${cardClass}" id="hist-card-${item.job_uuid}">
                <img src="${item.thumbnail || ''}" class="thumb-preview" alt="Thumb" data-fallback="true">
                
                <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <h6 class="fw-bold text-truncate m-0" style="max-width: 65%;">${item.title || item.file_name || 'Download Item'}</h6>
                        <span class="badge-status ${badgeClass}">${badgeIcon}${item.status}</span>
                    </div>

                    <div class="d-flex align-items-center gap-3 text-muted" style="font-size: 13px;">
                        <span class="badge bg-secondary text-uppercase">${item.format || 'FILE'}</span>
                        <span>${item.quality || 'Original'}</span>
                        ${formattedSize ? `<span class="fw-semibold text-primary"><i class="bi bi-hdd me-1"></i>${formattedSize}</span>` : ''}
                        ${formattedDate ? `<span class="ms-auto text-muted small"><i class="bi bi-calendar3 me-1"></i>${formattedDate}</span>` : ''}
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2 ms-2">
                    ${isCompleted ? `
                        <button class="btn btn-sm btn-primary btn-hist-open-file hover-lift" data-path="${item.file_path}" title="Play / Open File">
                            <i class="bi bi-play-circle-fill me-1"></i> Open
                        </button>
                        <button class="btn btn-sm btn-outline-secondary btn-hist-open-folder hover-lift" data-path="${item.file_path}" title="Open Folder">
                            <i class="bi bi-folder2-open"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-danger btn-hist-delete hover-lift" data-uuid="${item.job_uuid}" title="Delete Record">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    formatBytes(bytes, decimals = 2) {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    bindCardActions() {
        // Bind thumbnail fallback (CSP-safe, correct relative path)
        document.querySelectorAll('.thumb-preview[data-fallback]').forEach(img => {
            img.addEventListener('error', function () {
                if (!this.dataset.hasFailed) {
                    this.dataset.hasFailed = 'true';
                    this.src = 'assets/icons/icon.png';
                }
            });
        });

        document.querySelectorAll('.btn-hist-open-file').forEach(btn => {
            btn.onclick = (e) => {
                const path = e.currentTarget.getAttribute('data-path');
                window.ytdown.openFile(path).catch(err => window.app.showToast(err.message, 'danger'));
            };
        });

        document.querySelectorAll('.btn-hist-open-folder').forEach(btn => {
            btn.onclick = (e) => {
                const path = e.currentTarget.getAttribute('data-path');
                window.ytdown.openFolder(path).catch(err => window.app.showToast(err.message, 'danger'));
            };
        });

        document.querySelectorAll('.btn-hist-delete').forEach(btn => {
            btn.onclick = async (e) => {
                const uuid = e.currentTarget.getAttribute('data-uuid');
                await window.ytdown.deleteHistoryItem(uuid);
                window.app.showToast('Item removed from history', 'info');
                await this.loadHistory();
            };
        });
    }
}

window.historyController = new HistoryController();
