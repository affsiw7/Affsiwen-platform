#!/usr/bin/env python3
"""Verify the extracted package. No network or credentials required."""
import hashlib, json
from pathlib import Path
root = Path(__file__).resolve().parent
manifest = json.loads((root / 'FILE_MANIFEST.json').read_text())
errors = []
for item in manifest['files']:
    path = root / item['path']
    if not path.is_file() or path.stat().st_size != item['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest() != item['sha256']:
        errors.append(item['path'])
if errors:
    raise SystemExit('FAILED: ' + ', '.join(errors))
print('Verified', len(manifest['files']), 'files')
