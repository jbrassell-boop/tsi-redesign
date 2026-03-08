const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const filepath = 'AMT_InventoryPricingList.xlsx';
if (!fs.existsSync(filepath)) {
    console.error('File not found');
    process.exit(1);
}

// Just read the raw strings as best effort to get a sense of the items
// Note: real extraction of XLSX in pure JS without libraries is hard,
// but we only need a few sample lines to populate our UI.

// we will just grep for string patterns in the binary if possible as a super hack,
// or we can use powershell to extract the text using a much simpler C# inline snippet.
