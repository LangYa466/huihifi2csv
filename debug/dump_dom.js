const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    console.log('Navigating...');
    await page.goto('https://huihifi.com/evaluation/5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d', { waitUntil: 'networkidle0', timeout: 60000 });

    await new Promise(r => setTimeout(r, 5000));

    const html = await page.content();
    fs.writeFileSync('full_dom.html', html);

    console.log('DOM saved.');
    await browser.close();
})();
