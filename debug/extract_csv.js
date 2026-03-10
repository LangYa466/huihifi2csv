const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
const networkDir = path.join(__dirname, 'network_dumps');

const targets = [
    '94db 至臻原声',
    '94db 纯享人声',
    '94db 丹拿特调',
    '34db 高洁解析',       // User wrote "高洁解析" maybe they meant 高清解析
    '94db 高清解析',       // Add alternates just in case
    '34db 高清解析',
    '94db 澎湃低音'
];

// In hi-fi sites, curve names are sometimes stored as name property
let foundCurves = {};

const files = fs.readdirSync(networkDir);
for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
        const content = fs.readFileSync(path.join(networkDir, file), 'utf8');
        const data = JSON.parse(content);

        function extractCurves(obj) {
            if (!obj || typeof obj !== 'object') return;

            // Check if this object represents a curve (has a name and some data array)
            if (obj.name && (typeof obj.name === 'string') && obj.data && Array.isArray(obj.data) && obj.data.length > 50) {
                // Let's check if the name matches our targets
                let isTarget = false;
                for (const t of targets) {
                    // Match loosely just in case
                    const cleanT = t.replace('高洁', '高清').replace('db ', 'db').toLowerCase();
                    const cleanName = obj.name.replace('db ', 'db').toLowerCase();

                    if (cleanName.includes(cleanT) || cleanName.includes(t.toLowerCase()) || obj.name.includes(t)) {
                        console.log(`Matched target: ${t} -> Found curve: ${obj.name} in ${file}`);
                        foundCurves[t] = obj.data;
                        isTarget = true;
                    }
                }

                // If the prompt is specific but names are slightly different
                // '94db 至臻原声:SPL(dB)' ... Let's also check if it just includes '至臻原声'
                const partialNames = ['至臻原声', '纯享人声', '丹拿特调', '高洁解析', '高清解析', '澎湃低音'];
                for (const p of partialNames) {
                    if (obj.name.includes(p)) {
                        console.log(`[Partial Match] found curve: ${obj.name} in ${file}`);
                        foundCurves[obj.name] = obj.data;
                    }
                }
            }

            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    extractCurves(obj[i]);
                }
            } else {
                for (let k in obj) {
                    extractCurves(obj[k]);
                }
            }
        }

        extractCurves(data);
    } catch (e) { }
}

console.log(`Found ${Object.keys(foundCurves).length} total curves.`);
for (const [name, curveData] of Object.entries(foundCurves)) {
    // Generate CSV
    // "frequency,raw"
    // "20.144928,10.479"

    // Some curve data are arrays of arrays [freq, spl] or objects {x: freq, y: spl}
    let lines = ['frequency,raw'];
    for (const point of curveData) {
        if (Array.isArray(point) && point.length >= 2) {
            lines.push(`${point[0]},${point[1]}`);
        } else if (typeof point === 'object' && point.x !== undefined && point.y !== undefined) {
            lines.push(`${point.x},${point.y}`);
        } else if (typeof point === 'object' && point[0] !== undefined && point[1] !== undefined) {
            lines.push(`${point[0]},${point[1]}`);
        }
    }

    const safeName = name.replace(/[:\\/*?|<>]/g, '_');
    const outPath = path.join(outDir, `${safeName}.csv`);
    fs.writeFileSync(outPath, lines.join('\n'));
    console.log(`Wrote ${outPath}`);
}
