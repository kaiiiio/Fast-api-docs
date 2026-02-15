import re
import json

file_path = r'c:\Users\nikit\Downloads\Nikita\Prepare\Knowledge-base\Dump_1\MongoDB_Notes.md'
output_path = r'hindi_lines.json'

hindi_pattern = re.compile(r'[\u0900-\u097F]')

results = []

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f, 1):
            if hindi_pattern.search(line):
                results.append({
                    'line': i,
                    'content': line.strip()
                })
except Exception as e:
    print(f"Error: {e}")

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"Found {len(results)} lines with Hindi text. Results saved to {output_path}")
