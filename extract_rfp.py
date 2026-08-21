import zipfile
import xml.etree.ElementTree as ET
import os
import sys

xlsx_path = "/Users/I848942/Desktop/Aderência_RFP_CacauShow.xlsx"

# Output buffer
lines = []

with zipfile.ZipFile(xlsx_path, 'r') as z:
    names = z.namelist()
    lines.append("=== ZIP CONTENTS ===")
    for n in names:
        lines.append(n)
    lines.append("")

    # Load shared strings
    shared_strings = []
    if 'xl/sharedStrings.xml' in names:
        with z.open('xl/sharedStrings.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = ''
            tag = root.tag
            if '{' in tag:
                ns = tag[tag.index('{'): tag.index('}')+1]
            for si in root.findall(f'{ns}si'):
                texts = []
                for t in si.iter(f'{ns}t'):
                    if t.text:
                        texts.append(t.text)
                shared_strings.append(''.join(texts))
        lines.append(f"=== SHARED STRINGS ({len(shared_strings)} total) ===")
        for i, s in enumerate(shared_strings[:20]):
            lines.append(f"  [{i}] {repr(s)}")
        lines.append("  ...")
        lines.append("")

    # Load workbook to get sheet names
    sheet_names = {}
    if 'xl/workbook.xml' in names:
        with z.open('xl/workbook.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            tag = root.tag
            ns = ''
            if '{' in tag:
                ns = tag[tag.index('{'): tag.index('}')+1]
            for sheet in root.iter(f'{ns}sheet'):
                attribs = sheet.attrib
                sheetId = attribs.get('sheetId', attribs.get('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetId', ''))
                rId = attribs.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id', '')
                sname = attribs.get('name', '')
                sheet_names[rId] = sname

    # Load relationships to map rId -> sheet file
    rels = {}
    if 'xl/_rels/workbook.xml.rels' in names:
        with z.open('xl/_rels/workbook.xml.rels') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = ''
            tag = root.tag
            if '{' in tag:
                ns = tag[tag.index('{'): tag.index('}')+1]
            for rel in root.findall(f'{ns}Relationship'):
                rid = rel.attrib.get('Id', '')
                target = rel.attrib.get('Target', '')
                rels[rid] = target

    # Find all sheet files
    sheet_files = sorted([n for n in names if n.startswith('xl/worksheets/sheet') and n.endswith('.xml')])

    # Build rId -> sheet name mapping via rels
    rid_to_name = {}
    for rid, target in rels.items():
        for sname_rid, sname in sheet_names.items():
            if sname_rid == rid:
                # normalize target
                clean_target = target.replace('../', 'xl/') if not target.startswith('xl/') else target
                if not clean_target.startswith('xl/'):
                    clean_target = 'xl/' + clean_target
                rid_to_name[clean_target] = sname

    lines.append(f"=== SHEETS FOUND: {len(sheet_files)} ===")
    for sf in sheet_files:
        sname = rid_to_name.get(sf, sf)
        lines.append(f"  {sf} -> '{sname}'")
    lines.append("")

    # Parse each sheet
    for sheet_file in sheet_files:
        sheet_display_name = rid_to_name.get(sheet_file, sheet_file)
        lines.append(f"{'='*80}")
        lines.append(f"SHEET: {sheet_display_name}  [{sheet_file}]")
        lines.append(f"{'='*80}")

        with z.open(sheet_file) as f:
            tree = ET.parse(f)
            root = tree.getroot()
            tag = root.tag
            ns = ''
            if '{' in tag:
                ns = tag[tag.index('{'): tag.index('}')+1]

            sheetData = root.find(f'{ns}sheetData')
            if sheetData is None:
                lines.append("  (no sheetData)")
                continue

            row_count = 0
            for row in sheetData.findall(f'{ns}row'):
                row_num = row.attrib.get('r', '?')
                cells = row.findall(f'{ns}c')
                row_values = []
                for cell in cells:
                    col_ref = cell.attrib.get('r', '?')
                    cell_type = cell.attrib.get('t', '')
                    v_el = cell.find(f'{ns}v')
                    is_el = cell.find(f'{ns}is')  # inline string

                    val = ''
                    if is_el is not None:
                        t_els = is_el.findall(f'{ns}t')
                        val = ''.join((t.text or '') for t in t_els)
                    elif v_el is not None and v_el.text is not None:
                        raw = v_el.text.strip()
                        if cell_type == 's':
                            try:
                                idx = int(raw)
                                val = shared_strings[idx] if idx < len(shared_strings) else f'[ss:{raw}]'
                            except ValueError:
                                val = raw
                        elif cell_type == 'b':
                            val = 'TRUE' if raw == '1' else 'FALSE'
                        else:
                            val = raw

                    if val:
                        row_values.append(f"{col_ref}={val}")

                if row_values:
                    lines.append(f"  Row {row_num}: " + " | ".join(row_values))
                    row_count += 1

            lines.append(f"  (total non-empty rows: {row_count})")
            lines.append("")

# Write output
output_path = "/tmp/rfp_output.txt"
with open(output_path, 'w', encoding='utf-8') as out:
    out.write('\n'.join(lines))

print(f"Done. Output written to {output_path}")
print(f"Total lines: {len(lines)}")
