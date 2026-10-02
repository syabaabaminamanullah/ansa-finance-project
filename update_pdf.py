import sys
import re

file_path = r"D:\web dev - ansa\ansa-finance-project\frontend\src\modules\finance\pages\ProjectFinancialReportsPage.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add import
import_statement = "import { addReportHeader, drawWatermark } from '../utils/pdfGenerator';\n"
if "addReportHeader" not in content:
    content = content.replace("import autoTable from 'jspdf-autotable';", "import autoTable from 'jspdf-autotable';\n" + import_statement)

# Replace PDF generation logic
target_start = "    const doc = new jsPDF('landscape', 'mm', 'a4');"
target_end = "    let currentY = (doc as any).lastAutoTable.finalY + 6;"

replacement = """    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const printDate = new Date().toLocaleString('id-ID');

    drawWatermark(doc);

    let currentY = addReportHeader(
      doc,
      'LAPORAN KEUANGAN PROYEK',
      `PROYEK: ${project.code} - ${project.name}`,
      '',
      printDate
    );
    currentY += 5;

    // Executive KPI summary box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, pageWidth - 28, 28, 2, 2, 'FD');

    const profitMargin = totalBilled - totalActualCost;
    
    // KPI 1: Budget
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('NILAI KONTRAK (BUDGET)', 20, currentY + 7);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175); // Blue
    doc.text(formatCurrency(budgetIDR), 20, currentY + 14);

    // Divider 1
    const divWidth = (pageWidth - 28) / 5;
    let currX = 14 + divWidth;
    doc.setDrawColor(203, 213, 225);
    doc.line(currX, currentY + 4, currX, currentY + 24);

    // KPI 2: Spent
    currX += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('BIAYA AKTUAL (SPENT)', currX, currentY + 7);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // Red
    doc.text(formatCurrency(totalActualCost), currX, currentY + 14);

    // Divider 2
    currX = 14 + divWidth * 2;
    doc.line(currX, currentY + 4, currX, currentY + 24);

    // KPI 3: Sisa
    currX += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('SISA ANGGARAN', currX, currentY + 7);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61); // Green
    doc.text(formatCurrency(remainingBudget), currX, currentY + 14);

    // Divider 3
    currX = 14 + divWidth * 3;
    doc.line(currX, currentY + 4, currX, currentY + 24);

    // KPI 4: AR
    currX += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL TAGIHAN (AR)', currX, currentY + 7);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 78, 216); // Blue
    doc.text(formatCurrency(totalBilled), currX, currentY + 14);

    // Divider 4
    currX = 14 + divWidth * 4;
    doc.line(currX, currentY + 4, currX, currentY + 24);

    // KPI 5: Profit
    currX += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('LABA PROYEK (PROFIT)', currX, currentY + 7);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    if (profitMargin >= 0) {
      doc.setTextColor(21, 128, 61); // Green
    } else {
      doc.setTextColor(185, 28, 28); // Red
    }
    doc.text(formatCurrency(profitMargin), currX, currentY + 14);
    
    currentY += 36;
"""

import re
pattern = re.compile(re.escape(target_start) + r".*?" + re.escape(target_end), re.DOTALL)
content = pattern.sub(replacement, content)

# Also fix table colors
content = content.replace("headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40] },", "headStyles: { fillColor: [254, 243, 199], textColor: [180, 83, 9] },") # Amber/Orange header

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replaced PDF logic.")
