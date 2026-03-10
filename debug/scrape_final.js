const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'network_dumps4');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    let counter = 0;

    page.on('response', async (res) => {
        try {
            const url = res.url();
            const text = await res.text();

            // Unconditional save for anything JSON-like
            if ((text.startsWith('{') || text.startsWith('[')) && text.length > 200) {
                const filename = `res_${counter++}.json`;
                fs.writeFileSync(path.join(outDir, filename), JSON.stringify({ url: url, text: text }) + '\n');
                console.log(`Saved ${filename} from ${url}`);
            }
        } catch (e) { }
    });

    console.log('Navigating to page...');
    await page.goto('https://huihifi.com/evaluation/5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Waiting a bit...');
    await new Promise(r => setTimeout(r, 8000));

    const modes = ['丹拿特调', '澎湃低音', '纯享人声', '至臻原声', '高清解析', '高洁解析'];

    for (const mode of modes) {
        console.log(`Clicking ${mode}...`);
        await page.evaluate(async (m) => {
            const els = Array.from(document.querySelectorAll('div, span, button')).filter(el => el.textContent.trim() === m);
            if (els.length > 0) {
                for (const el of els) {
                    try { el.click(); } catch (e) { }
                }
            }
        }, mode);

        await new Promise(r => setTimeout(r, 4000));
    }

    await browser.close();
    console.log('Done.');
})();
