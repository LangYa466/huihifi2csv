const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'everything_dumps');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    let counter = 0;

    page.on('response', async (res) => {
        try {
            const url = res.url();
            // skip images
            if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$/i)) return;
            const text = await res.text();

            if (text && text.length > 300) {
                const filename = `res_${counter++}.txt`;
                fs.writeFileSync(path.join(outDir, filename), `URL: ${url}\n\n` + text.substring(0, 1000));

                // If it's the actual data, save full to another file to be safe
                if (text.includes('\t') || text.includes('20.1') || url.includes('.txt') || url.includes('.csv')) {
                    fs.writeFileSync(path.join(outDir, `FULL_${filename}`), text);
                    console.log(`Saved FULL data from ${url}`);
                }
            }
        } catch (e) { }
    });

    console.log('Navigating to page...');
    await page.goto('https://huihifi.com/evaluation/5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d', { waitUntil: 'networkidle2', timeout: 60000 });

    // click modes
    const modes = ['丹拿特调', '澎湃低音', '纯享人声', '至臻原声', '高清解析', '高洁解析'];
    for (const mode of modes) {
        await page.evaluate(async (m) => {
            const els = Array.from(document.querySelectorAll('div, span, button')).filter(el => el.textContent.trim() === m);
            for (let e of els) { try { e.click(); } catch (err) { } }
        }, mode);
        await new Promise(r => setTimeout(r, 2000));
    }

    await browser.close();
    console.log('Done exploring everything.');
})();
