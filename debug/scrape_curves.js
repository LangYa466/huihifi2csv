const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'curves');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // We will save responses mapping them by URL or parsing them directly
    page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('evaluation') || url.includes('api')) {
            try {
                const text = await res.text();
                if (text.includes('\t') && text.includes('\n') && text.length > 500) {
                    // This is likely our TSV curve data
                    const filename = `curve_${Date.now()}_${Math.random().toString(36).substring(7)}.json`;
                    fs.writeFileSync(path.join(outDir, filename), JSON.stringify({ url, text: text.substring(0, 500) }) + '\n\n' + text);
                    console.log(`Saved TSV curve from ${url}`);
                }
            } catch (e) { }
        }
    });

    console.log('Navigating to page...');
    await page.goto('https://huihifi.com/evaluation/5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Waiting a bit for initial render...');
    await new Promise(r => setTimeout(r, 5000));

    // The UI should have some buttons for tuning modes. We should try to find and click them.
    // Let's inject a script to find elements with text like "至臻原声" and click them.
    const modes = ['丹拿特调', '澎湃低音', '纯享人声', '至臻原声', '高清解析', '高洁解析'];

    for (const mode of modes) {
        console.log(`Trying to click ${mode}...`);
        await page.evaluate(async (m) => {
            const els = Array.from(document.querySelectorAll('div, span, button')).filter(el => el.textContent.trim() === m);
            if (els.length > 0) {
                els[els.length - 1].click(); // usually the deepest element is the clickable one
            }
        }, mode);

        await new Promise(r => setTimeout(r, 3000)); // wait for network
    }

    console.log('Done clicking modes. Closing browser.');
    await browser.close();
})();
