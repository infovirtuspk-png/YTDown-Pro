const fs = require('fs');
const path = require('path');

const srcCertPath = 'C:\\Users\\OFFICE\\.gemini\\antigravity-ide\\brain\\74b22542-7b02-4b81-ac5e-f9299a47c308\\mit_certificate_3d_1788331004175.jpg';
const destDir = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'images');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const destJpg = path.join(destDir, 'mit_certificate_3d.jpg');
const destPng = path.join(destDir, 'mit_certificate_3d.png');

if (fs.existsSync(srcCertPath)) {
    fs.copyFileSync(srcCertPath, destJpg);
    fs.copyFileSync(srcCertPath, destPng);
    console.log('[✓] 3D MIT License Certificate copied to assets/images/');
} else {
    console.error('Source 3D certificate image not found!');
}
