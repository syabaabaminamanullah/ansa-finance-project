import sys

def main():
    file_path = "frontend/src/modules/finance/utils/purchaseOrderPDF.ts"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    block_to_remove = """  // Status Badge Pill below the box
  const statusStr = (po.status || 'DRAFT').toUpperCase();
  const isCompleted = statusStr === 'COMPLETED';
  const isApproved = statusStr === 'APPROVED';
  const badgeBg: [number, number, number] = isCompleted ? [220, 252, 231] : isApproved ? [224, 231, 255] : [241, 245, 249];
  const badgeTextCol: [number, number, number] = isCompleted ? [22, 101, 52] : isApproved ? [30, 58, 138] : [71, 85, 105];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const badgeW = doc.getTextWidth(statusStr) + 8;
  const badgeX = pageWidth - 14 - badgeW;
  doc.setFillColor(...badgeBg);
  doc.roundedRect(badgeX, y + 21, badgeW, 5, 2.5, 2.5, 'F');
  doc.setTextColor(...badgeTextCol);
  doc.text(statusStr, badgeX + (badgeW / 2), y + 24.5, { align: 'center' });"""

    if block_to_remove in content:
        content = content.replace(block_to_remove, "  // Status Badge Block Removed")
        print("Block removed successfully.")
    else:
        # Fallback if I already messed it up with previous regex
        import re
        content = re.sub(
            r"// Status Badge Pill below the box.*?doc\.setTextColor\(\.\.\.badgeTextCol\);\s*(doc\.text\(statusStr, badgeX \+ \(badgeW / 2\), y \+ 24\.5, \{ align: 'center' \}\);)?",
            "// Status Badge Block Removed",
            content,
            flags=re.DOTALL
        )
        # also remove the rect drawing
        content = re.sub(r"doc\.roundedRect\(badgeX, y \+ 21, badgeW, 5, 2\.5, 2\.5, 'F'\);", "", content)
        print("Fallback regex run.")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    main()
