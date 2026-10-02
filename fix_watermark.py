import sys
import re

file_path = r"D:\web dev - ansa\ansa-finance-project\frontend\src\modules\finance\pages\ProjectFinancialReportsPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure it's called on autoTables
# We can inject `willDrawPage: () => { drawWatermark(doc); },` into autoTable options

# For autoTable calls, they are formatted as `autoTable(doc, {`
# We'll replace it with `autoTable(doc, {\n      willDrawPage: () => { drawWatermark(doc); },`

content = re.sub(r"autoTable\(doc,\s*\{", "autoTable(doc, {\n      willDrawPage: () => { drawWatermark(doc); },", content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected drawWatermark into willDrawPage hooks.")
