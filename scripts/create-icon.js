const fs = require('fs');
const path = require('path');

const iconDir = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'icons');
if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

// Generate a dummy valid 1x1 png file if icon.ico doesn't exist
const icoPath = path.join(iconDir, 'icon.ico');
if (!fs.existsSync(icoPath)) {
    const minimalPngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d4b0000000049454e44ae426082';
    fs.writeFileSync(icoPath, Buffer.from(minimalPngHex, 'hex'));
    console.log('[✓] Icon asset initialized.');
}
