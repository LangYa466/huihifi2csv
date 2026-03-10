const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    let foundData = false;

    page.on('response', async (response) => {
        try {
            if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch') {
                const text = await response.text();
                if (text.includes('SPL(dB)') || text.includes('至臻原声')) {
                    fs.writeFileSync('raw_data.json', text);
                    console.log('Data successfully saved to raw_data.json');
                    foundData = true;
                }
            }
        } catch (e) {
            // ignore
        }
    });

    console.log('Navigating to page...');
    await page.goto('https://huihifi.com/evaluation/5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d', { waitUntil: 'networkidle0', timeout: 60000 });
    await browser.close();

    if (!foundData) {
        console.log('Failed to find data in network responses.');
    }
})();
