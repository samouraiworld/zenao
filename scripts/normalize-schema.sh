#!/usr/bin/env bash
# normalize-schema.sh — Sort foreign_key blocks alphabetically within each
# table in an Atlas HCL schema file. This ensures deterministic output
# regardless of atlas version or run-to-run ordering variance.
#
# Usage: normalize-schema.sh schema.hcl

set -euo pipefail

FILE="${1:?Usage: normalize-schema.sh <schema.hcl>}"

python3 -c "
import re, sys

content = open(sys.argv[1]).read()
lines = content.split('\n')

result = []
i = 0
while i < len(lines):
    line = lines[i]
    # Detect start of a foreign_key block
    m = re.match(r'^(\s*)foreign_key\s+\"([^\"]+)\"', line)
    if m:
        indent = m.group(1)
        # Collect all consecutive FK blocks at this indent level
        fk_blocks = []
        while i < len(lines):
            fm = re.match(r'^' + re.escape(indent) + r'foreign_key\s+\"([^\"]+)\"', lines[i])
            if fm:
                fk_name = fm.group(1)
                block_lines = [lines[i]]
                i += 1
                # Collect until closing brace at same indent
                while i < len(lines) and not re.match(r'^' + re.escape(indent) + r'\}$', lines[i]):
                    block_lines.append(lines[i])
                    i += 1
                if i < len(lines):
                    block_lines.append(lines[i])  # closing }
                    i += 1
                fk_blocks.append((fk_name, block_lines))
            else:
                break
        # Sort by FK name
        fk_blocks.sort(key=lambda x: x[0])
        for _, block in fk_blocks:
            result.extend(block)
    else:
        result.append(line)
        i += 1

with open(sys.argv[1], 'w') as f:
    f.write('\n'.join(result))
" "$FILE"
