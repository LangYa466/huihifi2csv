const fs = require('fs');

let C = {};
fs.readdirSync('network_dumps2').filter(f => f.endsWith('.json')).forEach(f => {
    try {
        const d = JSON.parse(fs.readFileSync('network_dumps2/' + f, 'utf8'));
        function S(o) {
            if (!o || typeof o !== 'object') return;
            // Check for TSV string data
            if (o.name && typeof o.name === 'string' && typeof o.data === 'string' && o.data.includes('\t')) {
                C[o.name] = o.data;
            }
            // Check for Array data
            if (o.name && typeof o.name === 'string' && Array.isArray(o.data) && o.data.length > 50) {
                C[o.name] = o.data;
            }

            if (Array.isArray(o)) o.forEach(S);
            else Object.values(o).forEach(S);
        }
        S(d);
    } catch (e) { }
});

fs.writeFileSync('keys.txt', JSON.stringify(Object.keys(C), null, 2));
console.log('Keys written to keys.txt');
