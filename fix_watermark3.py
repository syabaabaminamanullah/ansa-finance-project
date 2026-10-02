import sys
import re

file_path = r"D:\web dev - ansa\ansa-finance-project\frontend\src\modules\finance\pages\ProjectFinancialReportsPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I want to change all tables to theme: 'plain' and add the didDrawCell logic
# The regex looks for `theme: 'grid'`
# and I'll replace it with:
replacement = """theme: 'plain',
      styles: { fontSize: 8.5 },
      didDrawCell: (hookData) => {
        if (hookData.section === 'head') {
          doc.setDrawColor(212, 175, 55);
          doc.setLineWidth(0.4);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
        } else if (hookData.section === 'body') {
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(hookData.cell.x, hookData.cell.y + hookData.cell.height, hookData.cell.x + hookData.cell.width, hookData.cell.y + hookData.cell.height);
        }
      }"""

content = content.replace("theme: 'grid'", replacement)

# I should also add a manual drawWatermark at the beginning of the document because autoTable willDrawPage won't trigger for the area ABOVE the first table on page 1.
# Oh, earlier I removed it! Let's put it back right after printDate.
content = content.replace("const printDate = new Date().toLocaleString('id-ID');", "const printDate = new Date().toLocaleString('id-ID');\n\n    drawWatermark(doc);")

# And any manual `doc.addPage();` should also be followed by `drawWatermark(doc);`
content = content.replace("doc.addPage();\n    let currentY =", "doc.addPage();\n    drawWatermark(doc);\n    let currentY =")
content = content.replace("doc.addPage('landscape');\n    let currentY =", "doc.addPage('landscape');\n    drawWatermark(doc);\n    let currentY =")
content = content.replace("doc.addPage();\n          doc.text", "doc.addPage();\n          drawWatermark(doc);\n          doc.text")

# In some places it might be `doc.addPage();\n    doc.text`
content = content.replace("doc.addPage();\n    doc.text", "doc.addPage();\n    drawWatermark(doc);\n    doc.text")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated theme and added watermarks.")
