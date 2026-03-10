const fs = require('fs');
const path = require('path');

const inDir = path.join(__dirname, 'network_dumps3');
const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const files = fs.readdirSync(inDir);

// User requested variations
const exactRequired = [
    { target: '94db 至臻原声', matchKeys: ['94db 至臻原声:SPL(dB)', '94db 至臻原声', '至臻原声'] },
    { target: '94db 纯享人声', matchKeys: ['94db 纯享人声:SPL(dB)', '94db 纯享人声', '纯享人声'] },
    { target: '94db 丹拿特调', matchKeys: ['94db 丹拿特调:SPL(dB)', '94db 丹拿特调', '丹拿特调'] },
    { target: '34db 高洁解析', matchKeys: ['34db 高洁解析:SPL(dB)', '34db 高洁解析', '34db 高清解析', '34db 高清解析:SPL(dB)', '高清解析', '高洁解析'] },
    { target: '94db 澎湃低音', matchKeys: ['94db 澎湃低音:SPL(dB)', '94db 澎湃低音', '澎湃低音'] }
];

let allCurves = {};

for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
        const d = JSON.parse(fs.readFileSync(path.join(inDir, file), 'utf8'));
        const obj = d.data || d;

        function searchTargets(o) {
            if (!o || typeof o !== 'object') return;

            // In case data is a TSV string
            if (o.name && typeof o.name === 'string' && typeof o.data === 'string' && (o.data.includes('\t') || o.data.includes('\n'))) {
                allCurves[o.name] = o.data;
            }
            // In case data is an array of objects/numbers
            else if (o.name && typeof o.name === 'string' && Array.isArray(o.data) && o.data.length > 50) {
                allCurves[o.name] = o.data;
            }
            // In case the object itself is the array container, maybe it's {name: "...", series: [...]} or something
            else if (o.name && typeof o.name === 'string' && Array.isArray(o.series) && o.series.length > 50) {
                allCurves[o.name] = o.series;
            }

            if (Array.isArray(o)) {
                o.forEach(searchTargets);
            } else {
                Object.values(o).forEach(searchTargets);
            }
        }
        searchTargets(obj);
    } catch (e) { }
}

for (const req of exactRequired) {
    let matchedName = null;
    let foundData = null;
    for (const matchKey of req.matchKeys) {
        for (const sysName of Object.keys(allCurves)) {
            if (sysName.includes(matchKey) || matchKey.includes(sysName)) {
                matchedName = sysName;
                foundData = allCurves[sysName];
                break;
            }
        }
        if (matchedName) break;
    }

    // Fallback: If maybe the curve name is different but it corresponds exactly...
    if (!matchedName && req.target === '34db 高洁解析') {
        for (const sysName of Object.keys(allCurves)) {
            if (sysName.includes('高清解析') || sysName.includes('高洁解析')) {
                matchedName = sysName; foundData = allCurves[sysName]; break;
            }
        }
    }

    if (matchedName && foundData) {
        console.log(`\nMapping requested target [${req.target}] -> Found [${matchedName}]`);
        let outputLines = ['frequency,raw'];

        if (typeof foundData === 'string') {
            const lines = foundData.split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                    let freq, spl;
                    if (parts.length === 3) {
                        if (parseFloat(parts[0]) > 100) { freq = parts[1]; spl = parts[2]; } else { freq = parts[0]; spl = parts[1]; }
                    } else if (parts.length === 2) { freq = parts[0]; spl = parts[1]; }

                    if (freq && spl && !isNaN(parseFloat(freq)) && !isNaN(parseFloat(spl))) { outputLines.push(`${freq},${spl}`); }
                }
            }
        } else if (Array.isArray(foundData)) {
            for (const point of foundData) {
                if (Array.isArray(point) && point.length >= 2) {
                    outputLines.push(`${point[0]},${point[1]}`);
                } else if (point.x !== undefined && point.y !== undefined) {
                    outputLines.push(`${point.x},${point.y}`);
                }
            }
        }

        const outPath = path.join(outDir, `${req.target.replace('34db 高洁解析', '34db_高洁解析')}.csv`.replace(/ /g, '_'));
        if (outputLines.length > 20) {
            fs.writeFileSync(outPath, outputLines.join('\n'));
            console.log(`Saved output to output/${path.basename(outPath)} (${outputLines.length - 1} points)`);
        } else {
            console.log(`Error: Found valid data structure but parsing failed for ${req.target}`);
        }
    } else {
        console.log(`\nWARNING: Could not find any curve matching requested target [${req.target}]`);
    }
}
