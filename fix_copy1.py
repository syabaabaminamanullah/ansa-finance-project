import re
with open(r'backend\api\routes\copy1_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'"qty": parts\[8\]\.strip\(\) if len\(parts\) > 8 else "-",\s*"unit": parts\[9\]\.strip\(\) if len\(parts\) > 9 else "-",\s*"unit_price": parse_num\(parts\[10\]\) if len\(parts\) > 10 and parts\[10\]\.strip\(\) else amt,', re.DOTALL)

replacement = '''"qty": parts[9].strip() if len(parts) > 9 else "-",
                "unit": parts[10].strip() if len(parts) > 10 else "-",
                "unit_price": parse_num(parts[11]) if len(parts) > 11 and parts[11].strip() else amt,'''

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open(r'backend\api\routes\copy1_generator.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('FAILED')
