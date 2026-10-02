import sys
import re

file_path = r"D:\web dev - ansa\ansa-finance-project\frontend\src\modules\finance\pages\ProjectFinancialReportsPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will use a regex to replace any doc.setTextColor(x,x,x) immediately followed by doc.text('BAGIAN...)
content = re.sub(
    r"doc\.setTextColor\([^)]+\);\s*doc\.text\('BAGIAN",
    r"doc.setTextColor(194, 65, 12);\n    doc.text('BAGIAN",
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated all BAGIAN titles to orange.")
