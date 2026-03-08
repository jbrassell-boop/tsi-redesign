import csv
import json
import re

csv_path = "c:\\Users\\JoeBrassell\\.gemini\\antigravity\\scratch\\tsi-redesign\\AMT_InventoryPricingList.csv"
output_path = "c:\\Users\\JoeBrassell\\.gemini\\antigravity\\scratch\\tsi-redesign\\items_db.js"

items = []
categories = set()

# Best guess categorization based on keywords in description
def guess_category(desc):
    desc = desc.lower()
    if 'scissor' in desc: return 'Scissors'
    if 'forcep' in desc or 'fcp' in desc: return 'Forceps'
    if 'retractor' in desc: return 'Retractors'
    if 'needle holder' in desc or 'ndl' in desc: return 'Needle Holders'
    if 'clamp' in desc: return 'Clamps'
    if 'tube' in desc or 'cannula' in desc: return 'Tubes & Cannulas'
    if 'speculum' in desc: return 'Speculums'
    if 'curette' in desc: return 'Curettes'
    if 'rongeur' in desc: return 'Rongeurs'
    if 'elevator' in desc: return 'Elevators'
    if 'knife' in desc or 'blade' in desc or 'scalpel' in desc: return 'Knives & Blades'
    if 'hook' in desc: return 'Hooks'
    if 'probe' in desc: return 'Probes'
    
    # Catch all based on initial words if obvious
    words = desc.split()
    if len(words) > 1 and words[1] == 'products':
        return 'General Instruments'
        
    return 'Other Instruments'

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    # columns are: Inventory Size Key,Item Description,Size Description,Size Description 2,Size Description 3,Unit Cost
    
    for row in reader:
        # Check if the row has expected columns
        if 'Item Description' not in row or 'Unit Cost' not in row:
            continue
            
        desc = row['Item Description'].strip()
        sku = row['Inventory Size Key'].strip()
        
        # Combine size descriptions for a more detailed name if needed, or put in lot
        size1 = row.get('Size Description', '').strip()
        size2 = row.get('Size Description 2', '').strip()
        
        full_desc = desc
        if desc == 'Phoenix Products' and size1:
             full_desc = size1
             lot_desc = f"SKU: {sku}"
             if size2:
                 lot_desc += f" | {size2}"
        else:
             lot_desc = f"Lot: {sku}"
             if size1:
                 lot_desc += f" | {size1}"
             
             
        try:
            price_val = float(row['Unit Cost'].replace(',', '')) if row['Unit Cost'] else 0.0
        except ValueError:
            price_val = 0.0
            
        category = guess_category(full_desc)
        categories.add(category)
        
        # Skip really weird rows
        if not full_desc or price_val == 0.0:
            continue
            
        items.append({
            'name': full_desc,
            'lot': lot_desc,
            'price': price_val,
            'category': category,
            'sku': sku
        })
        
        # Limit to maybe 300 items so we don't overwhelm the dom manually, though JS can handle thousands easily
        # Actually it's 700 rows, lets just do all of them that have a price > 0

# Deduplicate by SKU just in case
unique_items = {item['sku']: item for item in items}.values()
final_items = list(unique_items)
final_items.sort(key=lambda x: x['name'])

cats_list = list(categories)
cats_list.sort()

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(f"const INVENTORY_DB = {json.dumps(final_items, indent=2)};\n")
    f.write(f"const INVENTORY_CATS = {json.dumps(cats_list, indent=2)};\n")
