const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'network_dumps');
const files = fs.readdirSync(outDir);

let totalLargeArrays = 0;

for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
        const content = fs.readFileSync(path.join(outDir, file), 'utf8');
        const data = JSON.parse(content);

        // simple recursive search for arrays
        function searchArrays(obj, path, filename) {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
                if (obj.length > 50 && typeof obj[0] === 'number') {
                    console.log(`[${filename}] Found large number array at ${path}: len=${obj.length}, first few=${obj.slice(0, 3).join(',')}`);
                    totalLargeArrays++;
                } else if (obj.length > 50 && typeof obj[0] === 'object') {
                    console.log(`[${filename}] Found large object array at ${path}: len=${obj.length}, first keys: ${Object.keys(obj[0])}`);
                    totalLargeArrays++;
                } else if (obj.length > 50 && Array.isArray(obj[0])) {
                    console.log(`[${filename}] Found large nested array at ${path}: len=${obj.length}, first entry len: ${obj[0].length}`);
                    totalLargeArrays++;
                }

                // Keep searching inside the array if its elements are objects
                for (let i = 0; i < Math.min(obj.length, 5); i++) {
                    searchArrays(obj[i], `${path}[${i}]`, filename);
                }
            } else {
                for (let k in obj) {
                    searchArrays(obj[k], `${path}.${k}`, filename);
                }
            }
        }

        searchArrays(data, 'root', file);
    } catch (e) {
        // console.error(`Failed to parse ${file}: ${e.message}`);
    }
}

if (totalLargeArrays === 0) {
    console.log("No large arrays found in any JSON dump!");
}
