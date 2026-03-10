const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('raw_data.json', 'utf8'));

const d = raw.data || raw;

function findData(obj, path = '') {
    if (!obj || typeof obj !== 'object') return [];

    let results = [];
    for (let key in obj) {
        if (Array.isArray(obj[key]) && obj[key].length > 10 && obj[key][0] && typeof obj[key][0] === 'object' && obj[key][0].hasOwnProperty('x')) {
            results.push(path + '.' + key + ' (Array of objects with x)');
        }
        if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === 'object' && obj[key][0].hasOwnProperty('data')) {
            results.push(path + '.' + key + ' (Array of objects with data array)');
        }
        if (key === 'series' || key === 'curves' || key === 'chartData') {
            results.push(path + '.' + key + ' (Found specific key name)');
        }
    }
    return results;
}

const res = findData(d);
console.log('Found structures:', res);

// Or let's just dump the top level keys again and their types 
for (let k of Object.keys(d)) {
    if (Array.isArray(d[k])) {
        // console.log(`Array ${k}: len=${d[k].length}, first=${JSON.stringify(d[k][0]).substring(0,100)}`);
    } else if (typeof d[k] === 'object') {
        const nested = Object.keys(d[k]);
        // console.log(`Object ${k}: keys=${nested}`);
    }
}

// Let's dump all keys that might be relevant
fs.writeFileSync('structure2.txt', JSON.stringify(d, (key, val) => {
    if (Array.isArray(val) && val.length > 5 && typeof val[0] === 'number') return `[Array of ${val.length} numbers]`;
    if (Array.isArray(val) && val.length > 5 && typeof val[0] === 'object') return `[Array of ${val.length} objects]`;
    return val;
}, 2));
