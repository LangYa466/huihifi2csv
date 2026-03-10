const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'network_dumps3');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    let counter = 0;

    page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('api.huihifi.com') || url.includes('/evaluation/') || url.includes('json')) {
            try {
                const text = await res.text();
                // Just save everything that looks like JSON and is reasonably large
                if (text.startsWith('{') || text.startsWith('[')) {
                    if (text.length > 500) {
                        const filename = `curve_${counter++}.json`;
                        fs.writeFileSync(path.join(outDir, filename), text);
                        console.log(`Saved JSON from ${url} to ${filename}`);
                    }
                }
            } catch (e) { }
        }
    });

    console.log('Navigating to page...');
    await page.goto('https://huihifi.com/evaluation/5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Waiting a bit...');
    await new Promise(r => setTimeout(r, 5000));

    // Sometimes they need to be clicked multiple times or they have a data-tuning=... attribute
    // We can also click on anything that has the exact text
    const modes = ['丹拿特调', '澎湃低音', '纯享人声', '至臻原声', '高清解析', '高洁解析'];

    for (const mode of modes) {
        console.log(`Clicking ${mode}...`);
        await page.evaluate(async (m) => {
            const els = Array.from(document.querySelectorAll('div, span, button')).filter(el => el.textContent.trim() === m);
            if (els.length > 0) {
                // Click all of them just in case (sometimes there's a mobile and desktop button)
                for (const el of els) {
                    try { el.click(); } catch (e) { }
                }
            }
        }, mode);

        await new Promise(r => setTimeout(r, 3000));
    }

    await browser.close();
    console.log('Done.');
})();
