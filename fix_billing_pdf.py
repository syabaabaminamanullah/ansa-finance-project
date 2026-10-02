import sys
import re

def main():
    file_path = "frontend/src/modules/finance/utils/billingInvoicePDF.ts"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update CustomInvoiceParams
    if "taxAmount?: number;" not in content:
        content = content.replace(
            "amount?: number;",
            "amount?: number;\n  baseAmount?: number;\n  taxAmount?: number;\n  ppnRate?: number;"
        )

    # 2. Update generateExactCoreterraInvoicePDF variables
    old_vars = """  const milestoneText = customParams?.milestone || 'Field preparation';
  const unitText = customParams?.unit || 'Lump Sump';
  const invAmount = customParams?.amount ?? 175000000;"""

    new_vars = """  const milestoneText = customParams?.milestone || 'Field preparation';
  const unitText = customParams?.unit || 'Lump Sump';
  const invBaseAmount = customParams?.baseAmount ?? customParams?.amount ?? 175000000;
  const invTaxAmount = customParams?.taxAmount ?? 0;
  const invTotalAmount = customParams?.amount ?? (invBaseAmount + invTaxAmount);
  const ppnRate = customParams?.ppnRate ?? 12;"""
    
    content = content.replace(old_vars, new_vars)

    # 3. Update Item Table to use invBaseAmount
    old_table = """        [
          '1.',
          fullItemDesc,
          milestoneText,
          unitText,
          formatMoney(invAmount)
        ]"""
    new_table = """        [
          '1.',
          fullItemDesc,
          milestoneText,
          unitText,
          formatMoney(invBaseAmount)
        ]"""
    content = content.replace(old_table, new_table)

    # 4. Update the Summary Box (Tagihan Ini, PPN, Total)
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
  doc.setTextColor(...accentColor);
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
  doc.setTextColor(...accentColor);
  doc.text('Total Harus Dibayar / Due:', sumX + 4, sy + 1.5);
  doc.text('Rp', rpX, sy + 1.5);
  doc.text(`${invTotalAmount.toLocaleString('id-ID')},-`, numRightX, sy + 1.5, { align: 'right' });"""
  
    content = content.replace(old_summary, new_summary)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("billingInvoicePDF updated.")

if __name__ == "__main__":
    main()
