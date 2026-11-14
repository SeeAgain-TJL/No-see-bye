"""Regenerate the city index: python scripts/generate-city-data.py cities15000.zip"""
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import zipfile
from datetime import date

raw = Path(sys.argv[1]).read_bytes()
rows = []
with zipfile.ZipFile(io.BytesIO(raw)) as source:
    for line in source.read('cities15000.txt').decode().splitlines():
        fields = line.split('\t')
        chinese_region = fields[8] in ('CN', 'HK', 'MO', 'TW')
        if chinese_region and fields[7] not in ('PPLC', 'PPLA', 'PPLA2'):
            continue
        name = fields[1]
        if chinese_region:
            han = [alias for alias in fields[3].split(',')
                   if re.fullmatch(r'[\u3400-\u9fff]{2,12}', alias)]
            city_names = [alias for alias in han if alias.endswith('市')]
            name = (city_names or han or [name])[0]
        rows.append([name, round(float(fields[4]), 4), round(float(fields[5]), 4)])

Path('src/data').mkdir(exist_ok=True)
Path('src/data/cities.json').write_text(
    json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
Path('public/geodata-notice.txt').write_text(
    'Nearby-city data: GeoNames (https://www.geonames.org/)\n'
    'Source: https://download.geonames.org/export/dump/cities15000.zip\n'
    f'Generated: {date.today().isoformat()}\n'
    f'Source SHA256: {hashlib.sha256(raw).hexdigest()}\n'
    'License: Creative Commons Attribution 4.0 International\n'
    'https://creativecommons.org/licenses/by/4.0/\n'
    'Changes: selected city names/coordinates only; Chinese alternate names where available; '
    'CN/HK/MO/TW limited to regional administrative seats; rounded coordinates.\n'
    'Approximate nearest-city lookup, not street-level reverse geocoding.\n', encoding='utf-8')
print('Bundled', len(rows), 'cities')
