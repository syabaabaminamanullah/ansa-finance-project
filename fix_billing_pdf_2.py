import sys
import re

def main():
    file_path = "frontend/src/modules/finance/utils/billingInvoicePDF.ts"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the EXACT block to replace
    old_summary = """  sy += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Tagihan Ini (Subtotal):', sumX + 4, sy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Rp', rpX, sy);
  doc.text(`${invAmount.toLocaleString('id-ID')},-`, numRightX, sy, { align: 'right' });

  sy += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text('PPN 11% / Tax:', sumX + 4, sy);
  doc.text('Rp', rpX, sy);
  doc.text('0,-', numRightX, sy, { align: 'right' });

  sy += 5.5;
  doc.setDrawColor(...subtleBorder);
  doc.line(sumX + 4, sy - 2, sumX + sumWidth - 4, sy - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('Total Harus Dibayar / Due:', sumX + 4, sy + 1.5);
  doc.text('Rp', rpX, sy + 1.5);
  doc.text(`${invAmount.toLocaleString('id-ID')},-`, numRightX, sy + 1.5, { align: 'right' });"""

    new_summary = """  sy += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Tagihan Ini (Subtotal):', sumX + 4, sy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('Rp', rpX, sy);
  doc.text(`${invBaseAmount.toLocaleString('id-ID')},-`, numRightX, sy, { align: 'right' });

  sy += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.text(`PPN ${ppnRate}% / Tax:`, sumX + 4, sy);
  doc.text('Rp', rpX, sy);
  doc.text(invTaxAmount > 0 ? `${invTaxAmount.toLocaleString('id-ID')},-` : '0,-', numRightX, sy, { align: 'right' });

  sy += 5.5;
  doc.setDrawColor(...subtleBorder);
  doc.line(sumX + 4, sy - 2, sumX + sumWidth - 4, sy - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('Total Harus Dibayar / Due:', sumX + 4, sy + 1.5);
  doc.text('Rp', rpX, sy + 1.5);
  doc.text(`${invTotalAmount.toLocaleString('id-ID')},-`, numRightX, sy + 1.5, { align: 'right' });"""

    if old_summary in content:
        content = content.replace(old_summary, new_summary)
        print("Summary replaced.")
    else:
        print("Summary NOT FOUND. Try fallback replacement.")
        # fallback regex
        import re
        content = re.sub(
            r"doc\.text\('Tagihan Ini \(Subtotal\):', sumX \+ 4, sy\);\n.*?doc\.text\(`\$\{invAmount\.toLocaleString\('id-ID'\)\},.*?doc\.text\('PPN 11% / Tax:', sumX \+ 4, sy\);\n.*?doc\.text\('0,-', numRightX, sy, \{ align: 'right' \}\);\n.*?doc\.text\('Total Harus Dibayar / Due:', sumX \+ 4, sy \+ 1\.5\);\n.*?doc\.text\(`\$\{invAmount\.toLocaleString\('id-ID'\)\},.*?\{ align: 'right' \}\);",
            new_summary.strip(),
            content,
            flags=re.DOTALL
        )
        print("Fallback regex applied.")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("DONE FIXING PDF 1.")

if __name__ == "__main__":
    main()
