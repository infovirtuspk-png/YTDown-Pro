// Content script for YTDown Pro Magnetic Universal Link Grabber & Quick Download Badge

(function () {
    let lastCopiedUrl = '';

    // Listen for clipboard copy events (Universal Magnetic Capture)
    document.addEventListener('copy', () => {
        navigator.clipboard.readText().then(text => {
            const cleanText = (text || '').trim();
            if (isDownloadableUrl(cleanText) && cleanText !== lastCopiedUrl) {
                lastCopiedUrl = cleanText;
                showMagneticPopup(cleanText);
            }
        }).catch(() => {});
    });

    // Message listener for notifications from background script
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'show_notification') {
            showToastNotification(request.message, request.type);
        }
    });

    // Check if URL is downloadable (Media streams, direct files, documents, archives, etc.)
    function isDownloadableUrl(url) {
        if (!url || typeof url !== 'string') return false;
        if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

        // 1. Streaming Media Platforms
        const mediaPatterns = [
            /youtube\.com\/watch/i,
            /youtu\.be\//i,
            /youtube\.com\/shorts/i,
            /vimeo\.com\//i,
            /tiktok\.com\//i,
            /instagram\.com\/(p|reel)\//i,
            /twitter\.com\/.*\/status/i,
            /x\.com\/.*\/status/i,
            /facebook\.com\/.*\/videos/i,
            /dailymotion\.com/i,
            /soundcloud\.com/i,
            /twitch\.tv/i,
            /bilibili\.com/i
        ];
        if (mediaPatterns.some(p => p.test(url))) return true;

        // 2. Direct File Extensions (Media, Documents, Archives, Software, Images)
        const fileExtRegex = /\.(mp4|mkv|avi|mov|webm|mp3|m4a|wav|aac|flac|ogg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|json|xml|zip|rar|7z|tar|gz|bz2|exe|msi|apk|dmg|iso|deb|rpm|jpg|jpeg|png|webp|gif|svg|bmp)(\?.*)?$/i;
        if (fileExtRegex.test(url)) return true;

        // 3. General HTTP/HTTPS links
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    // Detect link metadata category
    function getUrlCategoryMeta(url) {
        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.replace('www.', '');

            // Known streaming platforms
            if (/youtube\.com|youtu\.be/i.test(hostname)) return { label: 'YouTube Video', icon: '🎬', category: 'Media' };
            if (/vimeo\.com/i.test(hostname)) return { label: 'Vimeo Video', icon: '🎬', category: 'Media' };
            if (/tiktok\.com/i.test(hostname)) return { label: 'TikTok Video', icon: '📱', category: 'Media' };
            if (/instagram\.com/i.test(hostname)) return { label: 'Instagram Media', icon: '📷', category: 'Media' };
            if (/twitter\.com|x\.com/i.test(hostname)) return { label: 'X / Twitter Media', icon: '🐦', category: 'Media' };
            if (/facebook\.com/i.test(hostname)) return { label: 'Facebook Video', icon: '📹', category: 'Media' };
            if (/soundcloud\.com/i.test(hostname)) return { label: 'SoundCloud Audio', icon: '🎵', category: 'Audio' };

            // Direct file extension detection
            const match = parsed.pathname.match(/\.([a-z0-9]{2,6})(?:[?#]|$)/i);
            if (match && match[1]) {
                const ext = match[1].toLowerCase();
                if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return { label: `Archive (.${ext.toUpperCase()})`, icon: '📦', category: 'Archive' };
                if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) return { label: `Document (.${ext.toUpperCase()})`, icon: '📄', category: 'Document' };
                if (['exe', 'msi', 'apk', 'dmg', 'iso', 'deb', 'rpm'].includes(ext)) return { label: `Software (.${ext.toUpperCase()})`, icon: '⚙️', category: 'Software' };
                if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return { label: `Video File (.${ext.toUpperCase()})`, icon: '🎬', category: 'Media' };
                if (['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg'].includes(ext)) return { label: `Audio File (.${ext.toUpperCase()})`, icon: '🎵', category: 'Audio' };
                if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return { label: `Image (.${ext.toUpperCase()})`, icon: '🖼️', category: 'Image' };
            }

            return { label: `Direct Link (${hostname})`, icon: '🔗', category: 'General' };
        } catch (e) {
            return { label: 'Direct Download Link', icon: '⚡', category: 'General' };
        }
    }

    // Inject Floating Quick-Download Badge on Supported Media & Download Pages
    function injectQuickDownloadBadge() {
        if (document.getElementById('ytdownpro-floating-badge')) return;
        if (!isDownloadableUrl(window.location.href)) return;

        const meta = getUrlCategoryMeta(window.location.href);

        const badge = document.createElement('div');
        badge.id = 'ytdownpro-floating-badge';
        badge.className = 'ytdownpro-badge-animate';
        badge.innerHTML = `
            <div class="ytdownpro-badge-inner">
                <div class="ytdownpro-badge-drag-handle" title="Drag to move">
                    <span class="ytdownpro-drag-dots">⋮⋮</span>
                </div>
                <div class="ytdownpro-badge-action" title="Send to YTDown Pro for Download">
                    <span class="ytdownpro-badge-icon">${meta.icon}</span>
                    <span class="ytdownpro-badge-text">Download with YTDown Pro</span>
                </div>
                <button class="ytdownpro-badge-close" title="Close badge for this session">&times;</button>
            </div>
        `;

        makeBadgeDraggable(badge);
        document.body.appendChild(badge);
    }

    // Make badge moveable anywhere on screen
    function makeBadgeDraggable(badge) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;
        let hasMoved = false;

        const onMouseDown = (e) => {
            if (e.target.closest('.ytdownpro-badge-close')) return;
            isDragging = true;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;

            const rect = badge.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            badge.style.right = 'auto';
            badge.style.bottom = 'auto';
            badge.style.left = `${initialLeft}px`;
            badge.style.top = `${initialTop}px`;
            badge.classList.add('ytdownpro-dragging');

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                hasMoved = true;
            }

            const maxLeft = window.innerWidth - badge.offsetWidth - 10;
            const maxTop = window.innerHeight - badge.offsetHeight - 10;

            const newLeft = Math.max(10, Math.min(maxLeft, initialLeft + dx));
            const newTop = Math.max(10, Math.min(maxTop, initialTop + dy));

            badge.style.left = `${newLeft}px`;
            badge.style.top = `${newTop}px`;
        };

        const onMouseUp = () => {
            isDragging = false;
            badge.classList.remove('ytdownpro-dragging');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        badge.addEventListener('mousedown', onMouseDown);

        // Click action: triggers download only if user did not drag
        const actionBtn = badge.querySelector('.ytdownpro-badge-action');
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                if (hasMoved) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                chrome.runtime.sendMessage({
                    action: 'send_to_app',
                    url: window.location.href
                });
            });
        }

        // Close exit button (removes badge for this session; refresh brings it back)
        const closeBtn = badge.querySelector('.ytdownpro-badge-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                badge.classList.add('ytdownpro-badge-exit');
                setTimeout(() => badge.remove(), 250);
            });
        }
    }

    // Floating Toast Notification
    function showToastNotification(msg, type = 'success') {
        let toast = document.getElementById('ytdownpro-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ytdownpro-toast';
            document.body.appendChild(toast);
        }
        toast.className = `ytdownpro-toast-visible ${type}`;
        toast.innerHTML = `<span class="icon">⚡</span> <span>${msg}</span>`;

        setTimeout(() => {
            toast.className = '';
        }, 3500);
    }

    // Magnetic Popup with Rich Category Visuals
    function showMagneticPopup(url) {
        let pop = document.getElementById('ytdownpro-magnetic-pop');
        if (pop) pop.remove();

        const meta = getUrlCategoryMeta(url);

        pop = document.createElement('div');
        pop.id = 'ytdownpro-magnetic-pop';
        pop.innerHTML = `
            <div class="ytdownpro-pop-card">
                <div class="ytdownpro-pop-header">
                    <span class="ytdownpro-badge-icon">🧲</span>
                    <span>YTDown Pro Magnetic Grabber</span>
                    <button class="ytdownpro-close-btn">&times;</button>
                </div>
                <div class="ytdownpro-pop-body">
                    <div class="ytdownpro-meta-badge">
                        <span>${meta.icon}</span>
                        <span>${meta.label}</span>
                        <span class="badge-type">${meta.category}</span>
                    </div>
                    <p>Captured Link from Clipboard:</p>
                    <div class="ytdownpro-url-preview">${url}</div>
                </div>
                <div class="ytdownpro-pop-actions">
                    <button class="ytdownpro-btn-send">⚡ Send to YTDown Pro</button>
                    <button class="ytdownpro-btn-ignore">Dismiss</button>
                </div>
            </div>
        `;

        // Action Handlers
        pop.querySelector('.ytdownpro-close-btn').addEventListener('click', () => pop.remove());
        pop.querySelector('.ytdownpro-btn-ignore').addEventListener('click', () => pop.remove());
        pop.querySelector('.ytdownpro-btn-send').addEventListener('click', () => {
            chrome.runtime.sendMessage({
                action: 'send_to_app',
                url: url
            });
            pop.remove();
        });

        document.body.appendChild(pop);

        // Auto dismiss after 9 seconds
        setTimeout(() => {
            if (pop && pop.parentElement) pop.remove();
        }, 9000);
    }

    // Run injection on page load
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        injectQuickDownloadBadge();
    } else {
        window.addEventListener('DOMContentLoaded', injectQuickDownloadBadge);
    }
})();
