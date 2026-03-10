const fs = require('fs');
const path = require('path');

const inDir = path.join(__dirname, 'network_dumps2');
const files = fs.readdirSync(inDir);

let allCurves = {};

for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
        const d = JSON.parse(fs.readFileSync(path.join(inDir, file), 'utf8'));
        const obj = d.data || d;

        function searchTargets(o) {
            if (!o || typeof o !== 'object') return;

            if (o.name && typeof o.name === 'string' && typeof o.data === 'string' && (o.data.includes('\t') || o.data.includes('\n'))) {
                allCurves[o.name] = o.data;
            }
            else if (o.name && typeof o.name === 'string' && typeof o.data === 'object' && Array.isArray(o.data) && o.data.length > 50) {
                allCurves[o.name] = o.data;
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

const target = '94db 澎湃低音';
let foundName = Object.keys(allCurves).find(k => k.includes(target));

if (foundName) {
    console.log(`Found: ${foundName}`);
    const data = allCurves[foundName];
    console.log(`typeof data: ${typeof data}, isArray: ${Array.isArray(data)}`);
    if (typeof data === 'string') {
        console.log(`Snippet:\n${data.substring(0, 200)}`);
    } else {
        console.log(`Snippet:\n${JSON.stringify(data[0])}`);
    }
} else {
    console.log('Not found');
}
