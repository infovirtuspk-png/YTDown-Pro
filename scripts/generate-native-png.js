const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a valid 64x64 raw RGBA PNG image buffer
function createValidPng(width, height, r, g, b, a) {
    const rawData = [];
    for (let y = 0; y < height; y++) {
        rawData.push(0); // filter type 0 (None)
        for (let x = 0; x < width; x++) {
            // Purple/indigo gradient effect
            const factor = (x + y) / (width + height);
            const pr = Math.round(99 * (1 - factor) + 168 * factor);
            const pg = Math.round(102 * (1 - factor) + 85 * factor);
            const pb = Math.round(241 * (1 - factor) + 247 * factor);
            rawData.push(pr, pg, pb, 255);
        }
    }

    const compressed = zlib.deflateSync(Buffer.from(rawData));

    function chunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length, 0);
        const typeBuf = Buffer.from(type, 'ascii');
        const body = Buffer.concat([typeBuf, data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(body), 0);
        return Buffer.concat([len, body, crc]);
    }

    // CRC32 table & function
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            if (c & 1) c = 0xedb88320 ^ (c >>> 1);
            else c = c >>> 1;
        }
        crcTable[n] = c;
    }
    function crc32(buf) {
        let c = 0xffffffff;
        for (let i = 0; i < buf.length; i++) {
            c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        }
        return (c ^ 0xffffffff) >>> 0;
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // RGBA color type
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdrChunk = chunk('IHDR', ihdr);
    const idatChunk = chunk('IDAT', compressed);
    const iendChunk = chunk('IEND', Buffer.alloc(0));

    return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

const pngBuffer = createValidPng(64, 64, 99, 102, 241, 255);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), pngBuffer);

console.log('[✓] Genuine valid PNG icon created at icon.png & icon.ico');
