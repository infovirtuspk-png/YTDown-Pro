const LOCAL_API = 'http://127.0.0.1:18492';

// Create right-click context menu item
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'ytdownpro-download-link',
        title: '⚡ Download with YTDown Pro',
        contexts: ['link', 'selection', 'page', 'video', 'audio', 'image']
    });
});

// Context Menu Click Listener
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'ytdownpro-download-link') {
        const targetUrl = info.linkUrl || info.srcUrl || info.selectionText || tab.url;
        if (targetUrl) {
            sendUrlToApp(targetUrl);
        }
    }
});

// Magnetic Clipboard & Content Script Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'send_to_app') {
        sendUrlToApp(request.url, request.quality, request.format)
            .then(res => sendResponse({ success: true, data: res }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Keep message channel open async
    }

    if (request.action === 'check_app_status') {
        checkAppConnection()
            .then(connected => sendResponse({ connected }))
            .catch(() => sendResponse({ connected: false }));
        return true;
    }
});

async function sendUrlToApp(url, quality = '1080p', format = 'mp4') {
    try {
        const response = await fetch(`${LOCAL_API}/api/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, quality, format })
        });
        const data = await response.json();

        // Flash badge on extension icon
        chrome.action.setBadgeText({ text: '⚡' });
        chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
        setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);

        // Notify active tab with toast
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'show_notification',
                    type: 'success',
                    message: 'Link sent to YTDown Pro!'
                }).catch(() => {});
            }
        });

        return data;
    } catch (err) {
        console.warn('API communication error, falling back to protocol client:', err);
        
        // Fallback to custom protocol URL trigger
        chrome.tabs.create({ url: `ytdownpro://download?url=${encodeURIComponent(url)}`, active: false }, (t) => {
            setTimeout(() => { chrome.tabs.remove(t.id); }, 1200);
        });

        // Flash warning badge
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
        setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);

        return { success: true, fallback: true };
    }
}

async function checkAppConnection() {
    try {
        const res = await fetch(`${LOCAL_API}/api/status`);
        return res.ok;
    } catch (err) {
        return false;
    }
}
