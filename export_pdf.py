import sys

file_path = r"D:\web dev - ansa\ansa-finance-project\frontend\src\modules\finance\utils\pdfGenerator.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const addReportHeader = ", "export const addReportHeader = ")
content = content.replace("const drawWatermark = ", "export const drawWatermark = ")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Exported addReportHeader and drawWatermark.")
