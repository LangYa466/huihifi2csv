const fs = require('fs');
const path = require('path');

const inDir = path.join(__dirname, 'everything_dumps');
const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const files = fs.readdirSync(inDir);

const exportTargets = [
    { target: '94db 至臻原声' },
    { target: '94db 纯享人声' },
    { target: '94db 丹拿特调' },
    { target: '34db 高洁解析', alt: ['34db 高清解析', '94db 高清解析', '高清解析', '高洁解析'] },
    { target: '94db 澎湃低音' }
];

let allCurves = {};

for (const file of files) {
    if (!file.startsWith('FULL_') && !file.endsWith('.txt')) continue; // FULL files have the complete string
    try {
        const fullPath = path.join(inDir, file);
        let content = fs.readFileSync(fullPath, 'utf8');

        if (content.startsWith('URL:')) {
            // Strip the URL header
            content = content.substring(content.indexOf('\n\n') + 2);
        }

        const d = JSON.parse(content);
        const obj = d.data || d;

        function search(o) {
            if (!o || typeof o !== 'object') return;
            if (o.name && typeof o.name === 'string' && o.dataSet && Array.isArray(o.dataSet)) {
                allCurves[o.name] = o.dataSet;
            }
            if (Array.isArray(o)) {
                o.forEach(search);
            } else {
                Object.values(o).forEach(search);
            }
        }
        search(obj);
    } catch (e) {
        // ignore parse error for non-json files
    }
}

for (const req of exportTargets) {
    let matchedName = null;
    let foundData = null;

    // exact match
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
        // Check if first row is header
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

        let outPath = path.join(outDir, `${req.target.replace('34db 高洁解析', '34db_高洁解析')}.csv`.replace(/ /g, '_'));
        fs.writeFileSync(outPath, lines.join('\n'));
        console.log(`Saved ${outPath} (${lines.length - 1} points)`);
    } else {
        console.log(`WARNING: NotFound for [${req.target}]`);
    }
}
