const engineManager = require('../src/main/services/engine-manager');

async function test() {
    console.log('Testing Engine Diagnostics...');
    const diag = await engineManager.getDiagnostics();
    console.log(JSON.stringify(diag, null, 2));
    
    if (diag.ytdlp.status === 'READY' && diag.ffmpeg.status === 'READY') {
        console.log('\n[SUCCESS] Engine Manager correctly detects bundled yt-dlp and FFmpeg binaries!');
    } else {
        console.error('\n[ERROR] Engine diagnostic failed!');
        process.exit(1);
    }
}

test().catch(err => {
    console.error(err);
    process.exit(1);
});
