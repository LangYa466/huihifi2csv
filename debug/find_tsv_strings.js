const fs = require('fs');

const d = JSON.parse(fs.readFileSync('network_dumps/resp_0.json', 'utf8')).data;

// In huihifi, measurement data might be stored in a field called 'curves' or 'specs' 
// Let's dump all string values longer than 1000 characters
function findLongStrings(obj, path = '') {
    if (!obj) return;
    if (typeof obj === 'string') {
        if (obj.length > 500 && obj.includes('\n') && obj.includes('\t')) {
            console.log(`Found long string at: ${path} (length: ${obj.length})`);
            fs.writeFileSync(`extracted_${path.replace(/[^a-zA-Z0-9]/g, '_')}.txt`, obj.slice(0, 500) + '\n...');
        }
    } else if (typeof obj === 'object') {
        for (let k in obj) {
            findLongStrings(obj[k], path ? `${path}.${k}` : k);
        }
    }
}

findLongStrings(d);
console.log('Done exploring resp_0.json for strings.');

// Maybe also resp_3.json?
const d3 = JSON.parse(fs.readFileSync('network_dumps/resp_3.json', 'utf8')).data;
findLongStrings(d3, 'resp3');
