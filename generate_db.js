const fs = require('fs');

const csvPath = 'c:\\Users\\JoeBrassell\\.gemini\\antigravity\\scratch\\tsi-redesign\\AMT_InventoryPricingList.csv';
const outputPath = 'c:\\Users\\JoeBrassell\\.gemini\\antigravity\\scratch\\tsi-redesign\\items_db.js';

function guessCategory(desc) {
    const d = desc.toLowerCase();
    if (d.includes('scissor')) return 'Scissors';
    if (d.includes('forcep') || d.includes('fcp')) return 'Forceps';
    if (d.includes('retractor')) return 'Retractors';
    if (d.includes('needle holder') || d.includes('ndl')) return 'Needle Holders';
    if (d.includes('clamp')) return 'Clamps';
    if (d.includes('tube') || d.includes('cannula')) return 'Tubes & Cannulas';
    if (d.includes('speculum')) return 'Speculums';
    if (d.includes('curette')) return 'Curettes';
    if (d.includes('rongeur')) return 'Rongeurs';
    if (d.includes('elevator')) return 'Elevators';
    if (d.includes('knife') || d.includes('blade') || d.includes('scalpel')) return 'Knives & Blades';
    if (d.includes('hook')) return 'Hooks';
    if (d.includes('probe')) return 'Probes';
    
    const words = d.split(/\s+/);
    if (words.length > 1 && words[1] === 'products') return 'General Instruments';
    
    return 'Other Instruments';
}

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    result.push(cur);
    return result;
}

try {
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n').filter(l => l.trim().length > 0);
    
    // Header should be: Inventory Size Key,Item Description,Size Description,Size Description 2,Size Description 3,Unit Cost
    const headers = parseCSVLine(lines[0].trim());
    
    const items = [];
    const categories = new Set();
    const uniqueItems = new Map();

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i].trim());
        if (row.length < 6) continue;
        
        const sku = row[0].trim();
        const desc = row[1].trim();
        const size1 = row[2] ? row[2].trim() : '';
        const size2 = row[3] ? row[3].trim() : '';
        const rawPrice = row[5] ? row[5].trim() : '';
        
        let fullDesc = desc;
        let lotDesc = `Lot: ${sku}`;
        
        if (desc === 'Phoenix Products' && size1) {
            fullDesc = size1;
            lotDesc = `SKU: ${sku}${size2 ? ' | ' + size2 : ''}`;
        } else {
            lotDesc = `Lot: ${sku}${size1 ? ' | ' + size1 : ''}`;
        }
        
        let priceVal = parseFloat(rawPrice.replace(/,/g, ''));
        if (isNaN(priceVal)) priceVal = 0.0;
        
        if (!fullDesc || priceVal === 0.0) continue;
        
        const category = guessCategory(fullDesc);
        categories.add(category);
        
        if (!uniqueItems.has(sku)) {
            uniqueItems.set(sku, {
                name: fullDesc,
                lot: lotDesc,
                price: priceVal,
                category: category,
                sku: sku,
                stock: Math.floor(Math.random() * 20) + 1 // mock stock roughly 1-20
            });
        }
    }
    
    const finalItems = Array.from(uniqueItems.values());
    finalItems.sort((a, b) => a.name.localeCompare(b.name));
    
    const catsList = Array.from(categories);
    catsList.sort();
    
    let out = `const INVENTORY_CATS = ${JSON.stringify(catsList, null, 2)};\n\n`;
    out += `const INVENTORY_DB = ${JSON.stringify(finalItems, null, 2)};\n`;
    
    fs.writeFileSync(outputPath, out, 'utf8');
    console.log(`Successfully extracted ${finalItems.length} items to ${outputPath}`);
    
} catch (e) {
    console.error(e);
}
