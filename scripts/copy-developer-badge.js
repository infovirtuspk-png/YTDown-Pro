const fs = require('fs');
const path = require('path');

const srcBadgePath = 'C:\\Users\\OFFICE\\.gemini\\antigravity-ide\\brain\\74b22542-7b02-4b81-ac5e-f9299a47c308\\developer_badge_3d_1788331674812.jpg';
const destDir = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'images');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const destPng = path.join(destDir, 'developer_badge.png');

if (fs.existsSync(srcBadgePath)) {
    fs.copyFileSync(srcBadgePath, destPng);
    console.log('[✓] 3D Developer Badge copied to assets/images/developer_badge.png');
} else {
    console.error('Source 3D developer badge image not found!');
}
