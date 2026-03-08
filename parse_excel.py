import zipfile
import xml.etree.ElementTree as ET
import os

filepath = 'AMT_InventoryPricingList.xlsx'

if not os.path.exists(filepath):
    print("File not found")
    exit(1)

results = []
try:
    with zipfile.ZipFile(filepath, 'r') as zf:
        try:
            shared_strings_xml = zf.read('xl/sharedStrings.xml')
            root = ET.fromstring(shared_strings_xml)
            namespace = {'ns': root.tag.split('}')[0].strip('{')}
            strings = []
            for t_node in root.findall('.//ns:si', namespace):
                t = t_node.find('ns:t', namespace)
                if t is not None:
                    strings.append(t.text or '')
                else:
                    # handle rich text
                    full_str = ''
                    for r in t_node.findall('.//ns:r/ns:t', namespace):
                        if r.text: full_str += r.text
                    strings.append(full_str)
        except Exception as e:
            strings = []

        sheet_xml = zf.read('xl/worksheets/sheet1.xml')
        root = ET.fromstring(sheet_xml)
        namespace = {'ns': root.tag.split('}')[0].strip('{')}
        
        for row in root.findall('.//ns:row', namespace)[:35]:
            row_data = []
            for cell in row.findall('.//ns:c', namespace):
                val = cell.find('ns:v', namespace)
                if val is not None:
                    if cell.get('t') == 's':
                        try:
                            row_data.append(strings[int(val.text)])
                        except:
                            row_data.append(val.text)
                    else:
                        row_data.append(val.text)
                else:
                    row_data.append('')
            results.append(' | '.join([str(x) for x in row_data]))
            
    for r in results:
        print(r)
except Exception as e:
    print(f"Error parsing: {e}")
