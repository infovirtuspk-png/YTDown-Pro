const fs = require('fs');
const path = require('path');

const srcImagePath = 'C:\\Users\\OFFICE\\.gemini\\antigravity-ide\\brain\\74b22542-7b02-4b81-ac5e-f9299a47c308\\ytdown_pro_icon_1788329712833.jpg';
const destDir = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'icons');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const iconPng = path.join(destDir, 'icon.png');
const iconIco = path.join(destDir, 'icon.ico');

if (fs.existsSync(srcImagePath)) {
    fs.copyFileSync(srcImagePath, iconPng);
    fs.copyFileSync(srcImagePath, iconIco);
    console.log('[✓] App icon successfully copied to icon.png and icon.ico');
} else {
    console.error('Source icon file not found!');
}
