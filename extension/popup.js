const LOCAL_API = 'http://127.0.0.1:18492';

document.addEventListener('DOMContentLoaded', async () => {
    const currentUrlEl = document.getElementById('current-url');
    const btnDownloadTab = document.getElementById('btn-download-tab');
    const selectFormat = document.getElementById('select-format');
    const selectQuality = document.getElementById('select-quality');
    const statusDot = document.getElementById('status-dot');
    const statusLabel = document.getElementById('status-label');
    const toggleMagnetic = document.getElementById('toggle-magnetic');
    const btnOpenApp = document.getElementById('btn-open-app');

    // 1. Check App Connection Status
    try {
        const res = await fetch(`${LOCAL_API}/api/status`);
        if (res.ok) {
            statusDot.className = 'status-dot green';
            statusLabel.textContent = 'Online';
        } else {
            throw new Error();
        }
    } catch (e) {
        statusDot.className = 'status-dot red';
        statusLabel.textContent = 'Offline';
    }

    // 2. Query Current Active Tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            currentUrlEl.textContent = tabs[0].url;
        } else {
            currentUrlEl.textContent = 'No active tab URL detected';
        }
    });

    // 3. Send Tab URL to YTDown Pro Desktop
    btnDownloadTab.addEventListener('click', async () => {
        const url = currentUrlEl.textContent;
        if (!url || url.startsWith('chrome://')) return;

        btnDownloadTab.disabled = true;
        btnDownloadTab.textContent = 'Sending...';

        try {
            await chrome.runtime.sendMessage({
                action: 'send_to_app',
                url: url,
                format: selectFormat.value,
                quality: selectQuality.value
            });
            btnDownloadTab.textContent = '✓ Sent to YTDown Pro!';
            setTimeout(() => {
                btnDownloadTab.disabled = false;
                btnDownloadTab.textContent = '⚡ Send Page to YTDown Pro';
            }, 2000);
        } catch (err) {
            btnDownloadTab.textContent = '❌ App Not Reachable';
            setTimeout(() => {
                btnDownloadTab.disabled = false;
                btnDownloadTab.textContent = '⚡ Send Page to YTDown Pro';
            }, 2000);
        }
    });

    // 4. Open YTDown Pro App Protocol Trigger
    btnOpenApp.addEventListener('click', () => {
        window.open('ytdownpro://open', '_self');
    });
});
