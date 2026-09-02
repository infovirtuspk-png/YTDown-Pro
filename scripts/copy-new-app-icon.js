const fs = require('fs');
const path = require('path');

const srcIconPath = 'C:\\Users\\OFFICE\\.gemini\\antigravity-ide\\brain\\74b22542-7b02-4b81-ac5e-f9299a47c308\\ytdown_pro_icon_2026_1788333483254.jpg';

const destLocations = [
    path.join(__dirname, '..', 'src', 'renderer', 'assets', 'icons', 'icon.png'),
    path.join(__dirname, '..', 'src', 'renderer', 'assets', 'icons', 'icon.ico'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', 'build', 'icon.png')
];

destLocations.forEach(destPath => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(srcIconPath)) {
        fs.copyFileSync(srcIconPath, destPath);
        console.log(`[✓] Updated icon: ${destPath}`);
    } else {
        console.error('Source icon image not found!');
    }
});
