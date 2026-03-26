#!/usr/bin/env python
"""
fill-csa.py — Fill a TSI CSA Word template with contract data

Usage: python fill-csa.py <template.docx> <data.json> <output.docx>
"""
import sys
import os
import json
import zipfile
import re
import shutil
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from helpers.merge_runs import merge_runs


def build_scope_table_xml(scopes):
    """Build OOXML table for Appendix A — no line-item pricing."""
    # Table style constants
    BORDER = '<w:tcBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/></w:tcBorders>'
    HDR_SHADE = '<w:shd w:val="clear" w:color="auto" w:fill="143B87"/>'
    ALT_SHADE = '<w:shd w:val="clear" w:color="auto" w:fill="EBF1FA"/>'

    def cell(text, width, bold=False, header=False, shading='', font_size='18', color='000000'):
        shade = ''
        if header:
            shade = HDR_SHADE
            color = 'FFFFFF'
        elif shading:
            shade = shading
        b_open = '<w:b/><w:bCs/>' if bold or header else ''
        return (
            f'<w:tc>'
            f'<w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>{BORDER}{shade}'
            f'<w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>'
            f'<w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>'
            f'</w:tcPr>'
            f'<w:p><w:pPr><w:jc w:val="left"/></w:pPr>'
            f'<w:r><w:rPr>{b_open}<w:color w:val="{color}"/>'
            f'<w:sz w:val="{font_size}"/><w:szCs w:val="{font_size}"/></w:rPr>'
            f'<w:t xml:space="preserve">{xml_escape(text)}</w:t></w:r></w:p>'
            f'</w:tc>'
        )

    # Column widths (total = 9360 DXA for 6.5" content width)
    W_NUM = 400
    W_FAC = 2500
    W_DEPT = 2000
    W_MODEL = 2460
    W_SERIAL = 2000

    # Header row
    hdr = (
        '<w:tr>'
        + cell('#', W_NUM, header=True)
        + cell('Facility', W_FAC, header=True)
        + cell('Department', W_DEPT, header=True)
        + cell('Model', W_MODEL, header=True)
        + cell('Serial Number', W_SERIAL, header=True)
        + '</w:tr>'
    )

    rows = hdr
    for i, s in enumerate(scopes):
        shade = ALT_SHADE if i % 2 == 1 else ''
        rows += (
            '<w:tr>'
            + cell(str(i + 1), W_NUM, shading=shade)
            + cell(s.get('facility', ''), W_FAC, shading=shade)
            + cell(s.get('department', ''), W_DEPT, shading=shade)
            + cell(s.get('model', ''), W_MODEL, shading=shade)
            + cell(s.get('serial', ''), W_SERIAL, shading=shade)
            + '</w:tr>'
        )

    table = (
        '<w:tbl>'
        '<w:tblPr>'
        '<w:tblStyle w:val="TableGrid"/>'
        f'<w:tblW w:w="{W_NUM + W_FAC + W_DEPT + W_MODEL + W_SERIAL}" w:type="dxa"/>'
        '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>'
        '</w:tblPr>'
        f'<w:tblGrid>'
        f'<w:gridCol w:w="{W_NUM}"/>'
        f'<w:gridCol w:w="{W_FAC}"/>'
        f'<w:gridCol w:w="{W_DEPT}"/>'
        f'<w:gridCol w:w="{W_MODEL}"/>'
        f'<w:gridCol w:w="{W_SERIAL}"/>'
        f'</w:tblGrid>'
        + rows
        + '</w:tbl>'
    )
    return table


def build_totals_xml(data):
    """Build totals paragraph(s) to replace «htmlTotalAnnual»."""
    monthly = data.get('totalMonthly', '')
    annual = data.get('totalAnnual', '')
    term = data.get('termMonths', '')

    def line(label, value):
        return (
            f'<w:p><w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>'
            f'<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>'
            f'<w:t xml:space="preserve">{xml_escape(label)}</w:t></w:r>'
            f'<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>'
            f'<w:t xml:space="preserve">{xml_escape(value)}</w:t></w:r>'
            f'</w:p>'
        )

    note = (
        '<w:p><w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr>'
        '<w:r><w:rPr><w:i/><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="666666"/></w:rPr>'
        '<w:t>Any additions or removals of equipment must be mutually agreed to in writing and may '
        'result in an adjustment to the fixed annual rate.</w:t></w:r></w:p>'
    )

    return (
        line(f'Term of Agreement: ', f'{term} Months')
        + line('Total Monthly Service Cost:  ', monthly)
        + line('Total Agreement Service Cost:  ', annual)
        + note
    )


def xml_escape(text):
    if not text:
        return ''
    text = str(text)
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    return text


def fill_template(template_path, data, output_path):
    tmp = tempfile.mkdtemp()
    try:
        # Unzip template
        with zipfile.ZipFile(template_path, 'r') as z:
            z.extractall(tmp)

        # Merge adjacent runs so «FieldName» is contiguous (modifies file in place)
        merge_runs(tmp)

        doc_path = os.path.join(tmp, 'word', 'document.xml')
        with open(doc_path, encoding='utf-8') as f:
            xml = f.read()

        # ── Simple field replacements ──────────────────────────────────
        replacements = {
            'ContractNumber':        data.get('contractNumber', ''),
            'ClientName':            data.get('clientName', ''),
            'ClientAddress':         data.get('clientAddressShort', ''),
            'ClientAddressLine1':    data.get('addressLine1', ''),
            'ClientAddressLine2':    data.get('addressLine2', ''),
            'ClientAddressLine3':    data.get('addressLine3', ''),
            'ClientPhone':           data.get('clientPhone', ''),
            'ClientEmail':           data.get('clientEmail', ''),
            'SalesRep':              data.get('salesRep', ''),
            'lTermMonths':           str(data.get('termMonths', '')),
            'ContractStartDateMonth': data.get('startMonth', ''),
            'ContractStartDateDay':   data.get('startDay', ''),
            'ContractStartDateYear':  data.get('startYear', ''),
            'QuoteTotalCost':        data.get('totalAnnual', ''),
            'sCoverageLimit':        data.get('coverageLimit', ''),
            'QuoteDate':             data.get('quoteDate', ''),
            'QuoteExpirationDate':   data.get('quoteExpDate', ''),
        }

        for field, value in replacements.items():
            xml = xml.replace(f'\u00ab{field}\u00bb', xml_escape(value))

        # ── Scope table: replace «htmlScopes» paragraph ────────────────
        scope_table_xml = build_scope_table_xml(data.get('scopes', []))
        # Replace the entire <w:p> containing «htmlScopes» with the table
        xml = re.sub(
            r'<w:p[^>]*>(?:(?!</w:p>).)*\u00abhtmlScopes\u00bb(?:(?!</w:p>).)*</w:p>',
            scope_table_xml,
            xml,
            flags=re.DOTALL
        )

        # ── Totals: replace «htmlTotalAnnual» paragraph ────────────────
        totals_xml = build_totals_xml(data)
        xml = re.sub(
            r'<w:p[^>]*>(?:(?!</w:p>).)*\u00abhtmlTotalAnnual\u00bb(?:(?!</w:p>).)*</w:p>',
            totals_xml,
            xml,
            flags=re.DOTALL
        )

        # Write back
        with open(doc_path, 'w', encoding='utf-8') as f:
            f.write(xml)

        # Repack as .docx
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for root, dirs, files in os.walk(tmp):
                for fname in files:
                    fpath = os.path.join(root, fname)
                    arcname = os.path.relpath(fpath, tmp)
                    zout.write(fpath, arcname)

    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print('Usage: fill-csa.py <template.docx> <data.json> <output.docx>')
        sys.exit(1)

    template_path = sys.argv[1]
    data_path = sys.argv[2]
    output_path = sys.argv[3]

    with open(data_path, encoding='utf-8') as f:
        data = json.load(f)

    fill_template(template_path, data, output_path)
    print('OK')
