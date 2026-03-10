const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'network_dumps');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let i = 0;
    page.on('response', async (response) => {
        try {
            const url = response.url();
            if (url.includes('.json') || response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
                const text = await response.text();
                // Check if it looks like measurement data or at least save it
                if (text.startsWith('{') || text.startsWith('[')) {
                    const filename = path.join(outDir, `resp_${i++}.json`);
                    fs.writeFileSync(filename, text);
                    console.log(`Saved ${filename} from ${url}`);
                }
            }
        } catch (e) {
            // ignore
        }
    });

    console.log('Navigating to page...');
    await page.goto('https://huihifi.com/evaluation/5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d', { waitUntil: 'networkidle0', timeout: 60000 });
    await browser.close();
    console.log('Done.');
})();
