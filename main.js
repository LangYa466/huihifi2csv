const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Please provide an evaluation ID as the first argument.');
    console.error('Example: node extract_by_id.js 5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d');
    process.exit(1);
}

const evalId = args[0];
const targetUrl = `https://huihifi.com/evaluation/${evalId}`;

// Create a specific output directory for this ID so they don't mix
const idOutDir = path.join(outDir, evalId);
if (!fs.existsSync(idOutDir)) fs.mkdirSync(idOutDir);

const exportTargets = [
    { target: '94db 至臻原声' },
    { target: '94db 纯享人声' },
    { target: '94db 丹拿特调' },
    { target: '34db 高洁解析', alt: ['34db 高清解析', '94db 高清解析', '高清解析', '高洁解析'] },
    { target: '94db 澎湃低音' }
];

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    let allCurves = {};

    // Intercept JSON responses containing chart arrays
    page.on('response', async (res) => {
        try {
            const url = res.url();
            if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$/i)) return;
            const text = await res.text();

            if (text.startsWith('{') || text.startsWith('[')) {
                if (text.length > 500) {
                    const d = JSON.parse(text);
                    const obj = d.data || d;

                    function search(o) {
                        if (!o || typeof o !== 'object') return;
                        if (o.name && typeof o.name === 'string' && o.dataSet && Array.isArray(o.dataSet) && o.dataSet.length > 50) {
                            allCurves[o.name] = o.dataSet;
                        }
                        if (Array.isArray(o)) {
                            o.forEach(search);
                        } else {
                            Object.values(o).forEach(search);
                        }
                    }
                    search(obj);
                }
            }
        } catch (e) { }
    });

    console.log(`Navigating to ${targetUrl} ...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Waiting for charts to load...');
    await new Promise(r => setTimeout(r, 6000));

    // The required targets are loaded dynamically when clicking their corresponding buttons.
    // We get all innerText of clickable items and click the ones related to tuning modes.
    const modes = ['丹拿特调', '澎湃低音', '纯享人声', '至臻原声', '高清解析', '高洁解析'];
    for (const mode of modes) {
        await page.evaluate(async (m) => {
            const els = Array.from(document.querySelectorAll('div, span, button')).filter(el => el.textContent.trim() === m);
            for (let e of els) { try { e.click(); } catch (err) { } }
        }, mode);
        await new Promise(r => setTimeout(r, 2000));
    }

    await browser.close();

    console.log(`\nNetwork interception finished. Found ${Object.keys(allCurves).length} curve arrays.`);

    let successCount = 0;

    for (const req of exportTargets) {
        let matchedName = null;
        let foundData = null;

        // Match user requested target to system keys
        const candidates = [req.target].concat(req.alt || []);
        for (const cand of candidates) {
            for (const sysName of Object.keys(allCurves)) {
                if (sysName.includes(cand) || cand.includes(sysName)) {
                    matchedName = sysName;
                    foundData = allCurves[sysName];
                    break;
                }
            }
            if (matchedName) break;
        }

        if (matchedName && foundData) {
            console.log(`Mapping [${req.target}] -> Found [${matchedName}]`);
            let lines = ['frequency,raw'];

            // Check if first row is a header
            let startIndex = 0;
            if (foundData.length > 0 && Array.isArray(foundData[0]) && isNaN(parseFloat(foundData[0][0]))) {
                startIndex = 1;
            }

            for (let i = startIndex; i < foundData.length; i++) {
                const pt = foundData[i];
                if (Array.isArray(pt) && pt.length >= 2) {
                    const freq = parseFloat(pt[0]);
                    const spl = parseFloat(pt[1]);
                    if (!isNaN(freq) && !isNaN(spl)) {
                        lines.push(`${freq},${spl}`);
                    }
                }
            }

            let outPath = path.join(idOutDir, `${req.target.replace('34db 高洁解析', '34db_高洁解析')}.csv`.replace(/ /g, '_'));
            fs.writeFileSync(outPath, lines.join('\n'));
            console.log(`Saved output: ${outPath} (${lines.length - 1} points)`);
            successCount++;
        } else {
            console.log(`WARNING: Could not find any curve matching requested target [${req.target}]`);
        }
    }

    console.log(`\nExtraction Complete: ${successCount}/${exportTargets.length} CSV files generated in output/${evalId}/.`);
})();
