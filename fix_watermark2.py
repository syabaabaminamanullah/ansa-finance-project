import sys

file_path = r"D:\web dev - ansa\ansa-finance-project\frontend\src\modules\finance\pages\ProjectFinancialReportsPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the standalone drawWatermark(doc);
content = content.replace("    drawWatermark(doc);", "")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Removed standalone drawWatermark.")
