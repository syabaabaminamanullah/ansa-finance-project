import sys
import re

file_path = r"D:\web dev - ansa\ansa-finance-project\frontend\src\modules\finance\pages\ProjectFinancialReportsPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace BAGIAN I header
content = content.replace("doc.setTextColor(20, 60, 100);", "doc.setTextColor(194, 65, 12);") # Orange text for BAGIAN I

# Update all headStyles
content = re.sub(
    r"headStyles:\s*\{\s*fillColor:\s*\[\d+,\s*\d+,\s*\d+\],\s*textColor:\s*\[\d+,\s*\d+,\s*\d+\],\s*fontStyle:\s*'bold'\s*\}",
    "headStyles: { fillColor: [255, 255, 255], textColor: [71, 85, 105], fontStyle: 'bold', lineWidth: 0.1, lineColor: [226, 232, 240] },\n      theme: 'grid'",
    content
)

# And remove old theme declarations if they exist right after
content = content.replace("theme: 'grid',\n      theme: 'grid'", "theme: 'grid'")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated table styles.")
