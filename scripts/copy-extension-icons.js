const fs = require('fs');
const path = require('path');

const srcIconPath = 'C:\\Users\\OFFICE\\.gemini\\antigravity-ide\\brain\\74b22542-7b02-4b81-ac5e-f9299a47c308\\ytdown_pro_icon_2026_1788333483254.jpg';
const extensionIconDir = path.join(__dirname, '..', 'extension', 'icons');

if (!fs.existsSync(extensionIconDir)) {
    fs.mkdirSync(extensionIconDir, { recursive: true });
}

['icon16.png', 'icon48.png', 'icon128.png'].forEach(filename => {
    const dest = path.join(extensionIconDir, filename);
    if (fs.existsSync(srcIconPath)) {
        fs.copyFileSync(srcIconPath, dest);
        console.log(`[✓] Extension icon copied: ${dest}`);
    }
});
