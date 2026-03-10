const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('raw_data.json', 'utf8'));

// find where the actual measurement data is
let modes = raw.availableTuningModes;
if (!Array.isArray(modes) && raw.data && raw.data.availableTuningModes) {
    modes = raw.data.availableTuningModes;
}

const summary = {
    availableTuningModes_type: typeof modes,
    is_array: Array.isArray(modes),
    first_item_keys: modes && modes[0] ? Object.keys(modes[0]) : null,
    first_item_sample: modes && modes[0] ? JSON.stringify(modes[0]).substring(0, 500) : null,
};

fs.writeFileSync('structure.txt', JSON.stringify(summary, null, 2));

console.log("Structure written");
