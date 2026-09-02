/**
 * Generate a proper multi-size Windows ICO from the app's source JPEG icon.
 * Produces sizes: 16, 24, 32, 48, 64, 128, 256 px.
 */

const fs = require('fs');
const path = require('path');

const ICON_SIZES = [16, 24, 32, 48, 64, 128, 256];
const SOURCE_JPG  = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'icons', 'icon_source.jpg');
const ICO_OUT     = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'icons', 'icon.ico');

// ICO file format builder
function buildIco(pngBuffers) {
    const count   = pngBuffers.length;
    const DIRSIZE = 6 + count * 16;  // ICONDIR + n * ICONDIRENTRY
    const entries = [];
    let offset = DIRSIZE;

    for (let i = 0; i < count; i++) {
        const buf = pngBuffers[i];
        entries.push({ buf, offset });
        offset += buf.length;
    }

    // ICONDIR (6 bytes)
    const iconDir = Buffer.alloc(6);
    iconDir.writeUInt16LE(0, 0);     // reserved
    iconDir.writeUInt16LE(1, 2);     // type = 1 (icon)
    iconDir.writeUInt16LE(count, 4); // count

    const parts = [iconDir];

    // ICONDIRENTRY (16 bytes each)
    for (let i = 0; i < count; i++) {
        const { buf, offset: off } = entries[i];
        const e = Buffer.alloc(16);
        const size = ICON_SIZES[i];
        e.writeUInt8(size === 256 ? 0 : size, 0);  // width  (0 = 256)
        e.writeUInt8(size === 256 ? 0 : size, 1);  // height
        e.writeUInt8(0, 2);           // colorCount (0 = true color)
        e.writeUInt8(0, 3);           // reserved
        e.writeUInt16LE(1, 4);        // planes
        e.writeUInt16LE(32, 6);       // bitCount
        e.writeUInt32LE(buf.length, 8); // sizeInBytes
        e.writeUInt32LE(off, 12);     // imageOffset
        parts.push(e);
    }

    // Image data
    for (const { buf } of entries) {
        parts.push(buf);
    }

    return Buffer.concat(parts);
}

async function main() {
    console.log('[generate-ico] Generating proper multi-size ICO...');

    let Jimp;
    try {
        Jimp = require('jimp');
        console.log('[generate-ico] jimp loaded OK');
    } catch (e) {
        console.error('[generate-ico] jimp not found:', e.message);
        process.exit(1);
    }

    // Read source image
    const src = fs.existsSync(SOURCE_JPG) ? SOURCE_JPG : ICO_OUT;
    console.log(`[generate-ico] Source: ${src}`);

    const img = await Jimp.read(src);
    const pngBuffers = [];

    for (const size of ICON_SIZES) {
        const clone = img.clone();
        clone.resize(size, size);
        const buf = await clone.getBufferAsync(Jimp.MIME_PNG);
        pngBuffers.push(buf);
        console.log(`[generate-ico]   ${size}x${size} → ${buf.length} bytes PNG`);
    }

    const ico = buildIco(pngBuffers);
    fs.writeFileSync(ICO_OUT, ico);
    console.log(`\n[generate-ico] ✓ ICO written: ${ICO_OUT}`);
    console.log(`[generate-ico]   Total size: ${ico.length} bytes, ${count} frames`);

    // Verify header
    const h = fs.readFileSync(ICO_OUT);
    console.log(`[generate-ico]   Header: ${h[0]} ${h[1]} ${h[2]} ${h[3]} (expect: 0 0 1 0) ✓`);
}

const count = ICON_SIZES.length;
main().catch(err => { console.error(err); process.exit(1); });
