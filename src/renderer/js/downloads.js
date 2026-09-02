class DownloadsController {
    constructor() {
        this.downloads = [];
        this.currentFilter = 'all';
    }

    async init() {
        this.bindEvents();
        await this.refreshDownloadsList();
        this.setupIpcListeners();
    }

    bindEvents() {
        // Queue Filter buttons
        document.querySelectorAll('.filter-queue-btn, .dq-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-queue-btn, .dq-filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentFilter = e.currentTarget.getAttribute('data-filter');
                this.renderList();
            });
        });

        // Header Action: Pause All
        const btnPauseAll = document.getElementById('btn-pause-all');
        if (btnPauseAll) {
            btnPauseAll.addEventListener('click', async () => {
                await window.ytdown.pauseAllDownloads();
                window.app.showToast('All downloads paused', 'info');
                await this.refreshDownloadsList();
            });
        }

        // Header Action: Resume All
        const btnResumeAll = document.getElementById('btn-resume-all');
        if (btnResumeAll) {
            btnResumeAll.addEventListener('click', async () => {
                await window.ytdown.resumeAllDownloads();
                window.app.showToast('Resuming all queued downloads', 'success');
                await this.refreshDownloadsList();
            });
        }

        // Header Action: Clear Completed
        const btnClearCompleted = document.getElementById('btn-clear-completed');
        if (btnClearCompleted) {
            btnClearCompleted.addEventListener('click', async () => {
                await window.ytdown.clearCompletedDownloads();
                window.app.showToast('Completed downloads cleared from queue', 'info');
                await this.refreshDownloadsList();
            });
        }
    }

    applyFilter(filter) {
        this.currentFilter = filter;
        this.renderList();
    }

    setupIpcListeners() {
        window.ytdown.onDownloadCreated((job) => {
            this.downloads.unshift(job);
            this.renderList();
            this.updateBadge();
        });

        window.ytdown.onDownloadProgress((data) => {
            const item = this.downloads.find(d => d.job_uuid === data.job_uuid);
            if (item) {
                item.progress = data.progress;
                item.speed = data.speed;
                item.eta = data.eta;
                item.totalSize = data.totalSize;
                item.status = data.status || 'DOWNLOADING';
                this.updateProgressCard(data);
                this.updateGlobalNetworkMonitor();
            }
        });

        window.ytdown.onDownloadPaused && window.ytdown.onDownloadPaused((data) => {
            const item = this.downloads.find(d => d.job_uuid === data.job_uuid);
            if (item) {
                item.status = 'PAUSED';
                item.speed = '0 KB/s';
            }
            this.renderList();
            this.updateBadge();
            this.updateGlobalNetworkMonitor();
        });

        window.ytdown.onDownloadResumed && window.ytdown.onDownloadResumed((data) => {
            const item = this.downloads.find(d => d.job_uuid === data.job_uuid);
            if (item) {
                item.status = 'QUEUED';
            }
            this.renderList();
            this.updateBadge();
            this.updateGlobalNetworkMonitor();
        });

        window.ytdown.onDownloadCompleted((data) => {
            const item = this.downloads.find(d => d.job_uuid === data.job_uuid);
            if (item) {
                item.status = 'COMPLETED';
                item.progress = 100;
                item.speed = 'Done';
                item.file_path = data.filePath;
                item.file_name = data.fileName;
            }
            this.renderList();
            this.updateBadge();
            this.updateGlobalNetworkMonitor();
        });

        window.ytdown.onDownloadFailed((data) => {
            const item = this.downloads.find(d => d.job_uuid === data.job_uuid);
            if (item) {
                item.status = 'FAILED';
                item.speed = '0 KB/s';
                item.error_message = data.errorMessage;
            }
            this.renderList();
            this.updateBadge();
            this.updateGlobalNetworkMonitor();
        });

        window.ytdown.onDownloadCancelled((data) => {
            const item = this.downloads.find(d => d.job_uuid === data.job_uuid);
            if (item) {
                item.status = 'CANCELLED';
                item.speed = '0 KB/s';
            }
            this.renderList();
            this.updateBadge();
            this.updateGlobalNetworkMonitor();
        });

        window.ytdown.onDownloadDeleted && window.ytdown.onDownloadDeleted((data) => {
            this.downloads = this.downloads.filter(d => d.job_uuid !== data.job_uuid);
            this.renderList();
            this.updateBadge();
            this.updateGlobalNetworkMonitor();
        });

        window.ytdown.onDownloadClearedCompleted && window.ytdown.onDownloadClearedCompleted(() => {
            this.downloads = this.downloads.filter(d => ['QUEUED', 'DOWNLOADING', 'CONVERTING', 'PAUSED'].includes(d.status));
            this.renderList();
            this.updateBadge();
            this.updateGlobalNetworkMonitor();
        });

        window.ytdown.onDownloadQueuePaused && window.ytdown.onDownloadQueuePaused(() => {
            this.downloads.forEach(d => {
                if (d.status === 'DOWNLOADING') {
                    d.status = 'PAUSED';
                    d.speed = '0 KB/s';
                }
            });
            this.renderList();
            this.updateBadge();
            this.updateGlobalNetworkMonitor();
        });

        window.ytdown.onDownloadQueueResumed && window.ytdown.onDownloadQueueResumed(() => {
            this.refreshDownloadsList();
        });
    }

    async refreshDownloadsList() {
        try {
            this.downloads = await window.ytdown.getDownloads();
            this.renderList();
            this.updateBadge();
            this.updateGlobalNetworkMonitor();
        } catch (err) {
            console.error('Failed fetching downloads:', err);
        }
    }

    updateBadge() {
        const activeCount = this.downloads.filter(d => ['QUEUED', 'DOWNLOADING', 'CONVERTING', 'PREPARING'].includes(d.status)).length;
        const badge = document.getElementById('queue-badge');
        if (badge) {
            badge.textContent = activeCount;
            badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
        }
    }

    updateGlobalNetworkMonitor() {
        const activeItems = this.downloads.filter(d => d.status === 'DOWNLOADING' || d.status === 'CONVERTING');
        const activeCountLabel = document.getElementById('network-active-count');
        const speedLabel = document.getElementById('network-speed-label');

        if (activeCountLabel) {
            activeCountLabel.textContent = `${activeItems.length} Active`;
        }

        if (!speedLabel) return;

        if (activeItems.length === 0) {
            speedLabel.textContent = '0 KB/s';
            return;
        }

        // Sum up active speeds in B/s
        let totalBps = 0;
        for (const item of activeItems) {
            if (!item.speed) continue;
            totalBps += this.parseSpeedToBps(item.speed);
        }

        speedLabel.textContent = this.formatSpeedBps(totalBps);
    }

    parseSpeedToBps(speedStr) {
        if (typeof speedStr !== 'string') return 0;
        const str = speedStr.trim();
        const match = str.match(/([\d.]+)\s*([A-Za-z/]+)/);
        if (!match) return 0;

        const val = parseFloat(match[1]);
        const unit = match[2].toLowerCase();

        if (unit.includes('gb') || unit.includes('gib')) return val * 1073741824;
        if (unit.includes('mb') || unit.includes('mib')) return val * 1048576;
        if (unit.includes('kb') || unit.includes('kib')) return val * 1024;
        return val;
    }

    formatSpeedBps(bps) {
        if (bps >= 1048576) return `${(bps / 1048576).toFixed(2)} MB/s`;
        if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
        return `${Math.round(bps)} B/s`;
    }

    renderList() {
        const container = document.getElementById('downloads-list-container');
        const emptyState = document.getElementById('downloads-empty-state');

        let filtered = this.downloads;
        if (this.currentFilter !== 'all') {
            filtered = this.downloads.filter(d => d.status === this.currentFilter);
        }

        if (!filtered || filtered.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = filtered.map(item => this.createCardHtml(item)).join('');

        this.bindCardActions();
    }

    createCardHtml(item) {
        const isDownloading = ['DOWNLOADING', 'CONVERTING', 'PREPARING'].includes(item.status);
        const isPaused = item.status === 'PAUSED';
        const isCompleted = item.status === 'COMPLETED';
        const isFailed = item.status === 'FAILED';
        const isCancelled = item.status === 'CANCELLED';
        const isQueued = item.status === 'QUEUED';

        let cardClass = 'is-queued';
        let badgeClass = 'badge-queued';
        let badgeIcon = '<i class="bi bi-clock-history"></i>';
        
        if (isDownloading) {
            cardClass = 'is-downloading';
            badgeClass = 'badge-downloading';
            badgeIcon = '<span class="spinner-grow spinner-grow-sm live-pulse-dot me-1"></span>';
        } else if (isPaused) {
            cardClass = 'is-queued';
            badgeClass = 'badge-queued';
            badgeIcon = '<i class="bi bi-pause-circle me-1"></i>';
        } else if (isCompleted) {
            cardClass = 'is-completed';
            badgeClass = 'badge-completed';
            badgeIcon = '<i class="bi bi-check-circle-fill animate-pop me-1"></i>';
        } else if (isFailed || isCancelled) {
            cardClass = 'is-failed';
            badgeClass = 'badge-failed';
            badgeIcon = '<i class="bi bi-x-circle me-1"></i>';
        }

        return `
            <div class="download-card animate-fade-in hover-lift ${cardClass}" id="card-${item.job_uuid}">
                <img src="${item.thumbnail || ''}" class="thumb-preview" alt="Thumb" data-fallback="true">
                
                <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <h6 class="fw-bold text-truncate m-0" style="max-width: 65%;">${item.title || item.file_name || 'Download Item'}</h6>
                        <span class="badge-status ${badgeClass}" id="status-badge-${item.job_uuid}">${badgeIcon}${item.status}</span>
                    </div>

                    <div class="d-flex align-items-center gap-3 mb-2 text-muted" style="font-size: 13px;">
                        <span><i class="bi bi-file-earmark-code me-1"></i>${item.format} • ${item.quality || 'Original'}</span>
                        ${isDownloading ? `<span id="speed-${item.job_uuid}" class="text-primary fw-bold ms-auto"><i class="bi bi-arrow-down-short"></i>${item.speed || '0 KB/s'}</span>` : ''}
                        ${isDownloading ? `<span id="eta-${item.job_uuid}" class="ms-2"><i class="bi bi-clock me-1"></i>${item.eta || '00:00'} remaining</span>` : ''}
                    </div>

                    <!-- Progress Bar Header -->
                    <div class="d-flex justify-content-between text-xs text-muted mb-1" style="font-size: 11px;">
                        <span id="percent-label-${item.job_uuid}" class="fw-bold text-primary">${item.progress || 0}%</span>
                        <span id="size-label-${item.job_uuid}">${item.totalSize || ''}</span>
                    </div>

                    <!-- Progress Bar -->
                    <div class="progress bg-light border" style="height: 10px; border-radius: 99px; overflow: hidden;">
                        <div class="progress-bar ${isDownloading ? 'progress-bar-shimmer' : (isCompleted ? 'bg-success' : 'bg-warning')}" 
                             id="progress-bar-${item.job_uuid}" 
                             role="progressbar" 
                             style="width: ${item.progress || 0}%;"></div>
                    </div>
                </div>

                <!-- Multi-Action Buttons -->
                <div class="d-flex align-items-center gap-2 ms-2">
                    ${isDownloading ? `
                        <button class="btn btn-sm btn-outline-warning btn-pause-job hover-lift" data-uuid="${item.job_uuid}" title="Pause / Stop Download">
                            <i class="bi bi-pause-fill fs-6"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-cancel-job hover-lift" data-uuid="${item.job_uuid}" title="Cancel Download">
                            <i class="bi bi-x-circle fs-6"></i>
                        </button>
                    ` : ''}

                    ${isPaused ? `
                        <button class="btn btn-sm btn-success btn-resume-job hover-lift" data-uuid="${item.job_uuid}" title="Resume Download">
                            <i class="bi bi-play-fill me-1"></i> Resume
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-job hover-lift" data-uuid="${item.job_uuid}" title="Delete Record">
                            <i class="bi bi-trash fs-6"></i>
                        </button>
                    ` : ''}

                    ${isQueued ? `
                        <button class="btn btn-sm btn-outline-danger btn-cancel-job hover-lift" data-uuid="${item.job_uuid}" title="Cancel">
                            <i class="bi bi-x-circle fs-6"></i>
                        </button>
                    ` : ''}

                    ${(isFailed || isCancelled) ? `
                        <button class="btn btn-sm btn-outline-primary btn-retry-job hover-lift" data-uuid="${item.job_uuid}" title="Retry Download">
                            <i class="bi bi-arrow-repeat me-1"></i> Retry
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-job hover-lift" data-uuid="${item.job_uuid}" title="Delete Record">
                            <i class="bi bi-trash fs-6"></i>
                        </button>
                    ` : ''}

                    ${isCompleted ? `
                        <button class="btn btn-sm btn-primary btn-open-file hover-lift" data-path="${item.file_path}" title="Play / Open File">
                            <i class="bi bi-play-circle-fill me-1"></i> Play
                        </button>
                        <button class="btn btn-sm btn-outline-secondary btn-open-folder hover-lift" data-path="${item.file_path}" title="Open Folder">
                            <i class="bi bi-folder2-open"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-job hover-lift" data-uuid="${item.job_uuid}" title="Delete from List">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    updateProgressCard(data) {
        const bar = document.getElementById(`progress-bar-${data.job_uuid}`);
        const speed = document.getElementById(`speed-${data.job_uuid}`);
        const eta = document.getElementById(`eta-${data.job_uuid}`);
        const badge = document.getElementById(`status-badge-${data.job_uuid}`);
        const percentLabel = document.getElementById(`percent-label-${data.job_uuid}`);
        const sizeLabel = document.getElementById(`size-label-${data.job_uuid}`);

        if (bar) bar.style.width = `${data.progress}%`;
        if (percentLabel) percentLabel.textContent = `${data.progress}%`;
        if (sizeLabel && data.totalSize) sizeLabel.textContent = data.totalSize;
        if (speed) speed.innerHTML = `<i class="bi bi-arrow-down-short"></i>${data.speed || '0 KB/s'}`;
        if (eta) eta.innerHTML = `<i class="bi bi-clock me-1"></i>${data.eta || '00:00'} remaining`;
        if (badge) badge.innerHTML = `<span class="spinner-grow spinner-grow-sm live-pulse-dot me-1"></span>${data.status || 'DOWNLOADING'}`;
    }

    bindCardActions() {
        // Thumbnail fallback (CSP-safe)
        document.querySelectorAll('.thumb-preview[data-fallback]').forEach(img => {
            img.addEventListener('error', function () {
                if (!this.dataset.hasFailed) {
                    this.dataset.hasFailed = 'true';
                    this.src = 'assets/icons/icon.png';
                }
            });
        });

        // Pause Job
        document.querySelectorAll('.btn-pause-job').forEach(btn => {
            btn.onclick = async (e) => {
                const uuid = e.currentTarget.getAttribute('data-uuid');
                await window.ytdown.pauseDownload(uuid);
                window.app.showToast('Download paused', 'info');
                await this.refreshDownloadsList();
            };
        });

        // Resume Job / Retry Job
        document.querySelectorAll('.btn-resume-job, .btn-retry-job').forEach(btn => {
            btn.onclick = async (e) => {
                const uuid = e.currentTarget.getAttribute('data-uuid');
                await window.ytdown.resumeDownload(uuid);
                window.app.showToast('Download resumed', 'success');
                await this.refreshDownloadsList();
            };
        });

        // Cancel Job
        document.querySelectorAll('.btn-cancel-job').forEach(btn => {
            btn.onclick = async (e) => {
                const uuid = e.currentTarget.getAttribute('data-uuid');
                await window.ytdown.cancelDownload(uuid);
                window.app.showToast('Download cancelled', 'warning');
                await this.refreshDownloadsList();
            };
        });

        // Delete Job
        document.querySelectorAll('.btn-delete-job').forEach(btn => {
            btn.onclick = async (e) => {
                const uuid = e.currentTarget.getAttribute('data-uuid');
                await window.ytdown.deleteDownload(uuid, false);
                window.app.showToast('Download removed', 'info');
                await this.refreshDownloadsList();
            };
        });

        // Play / Open File
        document.querySelectorAll('.btn-open-file').forEach(btn => {
            btn.onclick = (e) => {
                const path = e.currentTarget.getAttribute('data-path');
                window.ytdown.openFile(path).catch(err => window.app.showToast(err.message, 'danger'));
            };
        });

        // Open Folder
        document.querySelectorAll('.btn-open-folder').forEach(btn => {
            btn.onclick = (e) => {
                const path = e.currentTarget.getAttribute('data-path');
                window.ytdown.openFolder(path).catch(err => window.app.showToast(err.message, 'danger'));
            };
        });
    }
}

window.downloadsController = new DownloadsController();
