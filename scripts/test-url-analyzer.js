const urlAnalyzer = require('../src/main/services/url-analyzer');

async function test() {
    console.log('Testing Smart URL Analyzer...');

    const sampleMedia = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const sampleDirectFile = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    try {
        console.log('\n[1] Testing Media URL detection:');
        const resMedia = await urlAnalyzer.analyze(sampleMedia);
        console.log('Result:', { engine: resMedia.engine, category: resMedia.category, title: resMedia.title });

        console.log('\n[2] Testing Direct File URL detection:');
        const resFile = await urlAnalyzer.analyze(sampleDirectFile);
        console.log('Result:', { engine: resFile.engine, category: resFile.category, title: resFile.title, filesize: resFile.filesize });

        console.log('\n[✓] Smart URL Analyzer working properly!');
    } catch (err) {
        console.error('Analyzer error:', err);
    }
}

test();
