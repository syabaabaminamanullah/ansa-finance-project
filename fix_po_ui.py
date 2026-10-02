import sys
import re

def main():
    # 1. Modify PurchaseOrderPage.tsx (Frontend)
    po_page = "frontend/src/modules/finance/pages/PurchaseOrderPage.tsx"
    with open(po_page, "r", encoding="utf-8") as f:
        po_content = f.read()

    # Replacements for UI labels
    po_content = po_content.replace(
        "Batalkan Approval PO (Unapprove)?", 
        "Batalkan Jurnal Hutang PO (Unapprove)?"
    )
    po_content = po_content.replace(
        "<Check className=\"w-3.5 h-3.5\" /> Approve", 
        "<Check className=\"w-3.5 h-3.5\" /> Proses Jurnal (Terima Tagihan)"
    )
    po_content = po_content.replace(
        "Approve PO: Otomatis posting Jurnal Beban/Aset & Hutang Vendor (AP) ke Buku Besar", 
        "Proses Tagihan: Otomatis posting Jurnal Beban/Aset & Hutang Vendor (AP) ke Buku Besar"
    )
    po_content = po_content.replace(
        "<RotateCcw className=\"w-3.5 h-3.5\" /> Unapprove", 
        "<RotateCcw className=\"w-3.5 h-3.5\" /> Batal Jurnal"
    )
    po_content = po_content.replace(
        "Ya, Unapprove", 
        "Ya, Batalkan Jurnal"
    )

    # Replace the table status badge mapping specifically for "Approved"
    # Find: {selectedPo.status === 'Approved' ? 'bg-slate-100 text-slate-800' :
    # And the table column: {p.status === 'Approved' && <CheckCircle className="w-3 h-3" />} {p.status}
    
    # Let's change the output display text when p.status is 'Approved'. 
    # Instead of just {p.status}, we can do {p.status === 'Approved' ? 'Terjurnal (AP)' : p.status}
    # Wait, the easiest way is to leave the internal status as 'Approved' but change its display in the list.
    po_content = po_content.replace(
        "{p.status}", 
        "{p.status === 'Approved' ? 'Ditagih (AP)' : p.status}"
    )
    po_content = po_content.replace(
        "{selectedPo.status.toUpperCase()}", 
        "{selectedPo.status === 'Approved' ? 'DITAGIH (AP)' : selectedPo.status.toUpperCase()}"
    )

    with open(po_page, "w", encoding="utf-8") as f:
        f.write(po_content)
    print("PurchaseOrderPage.tsx updated.")

    # 2. Modify purchaseOrderPDF.ts (Frontend PDF generator)
    pdf_file = "frontend/src/modules/finance/utils/purchaseOrderPDF.ts"
    with open(pdf_file, "r", encoding="utf-8") as f:
        pdf_content = f.read()

    # The PDF usually prints watermark using doc.text('DRAFT'...) or something similar.
    # Let's find and remove it. It might be in a function drawing the status box.
    # If it looks like this:
    # doc.setFillColor(...); doc.rect(...); doc.text(status.toUpperCase(), ...);
    
    # We will use regex to comment out or remove the status stamp block entirely.
    # Let's see what the block looks like. I'll just remove the whole "Status Badge" logic.
    # Or simply:
    # const poStatus = customParams?.status || 'Draft';
    # if (poStatus === 'Draft') { ... draw badge ... }
    
    # Since I don't know the exact lines, let's just replace the text drawing of 'DRAFT' and 'APPROVED' with empty strings, or just hide the fill.
    pdf_content = re.sub(r"doc\.text\(poStatus\.toUpperCase\(\),.*?\);", "", pdf_content)
    pdf_content = re.sub(r"doc\.text\('DRAFT',.*?\);", "", pdf_content)
    pdf_content = re.sub(r"doc\.text\('APPROVED',.*?\);", "", pdf_content)
    
    # Actually, let's just make the status badge invisible by ignoring it.
    # Let's find where poStatus is used to draw the badge.
    # Usually: 
    # const statusText = poStatus.toUpperCase();
    # Let's just force the status badge to not render if possible.
    
    # A safer way is to find the exact code block by reading it first. 
    # Let's just output the script and run it, then manually check the PDF file.
    with open(pdf_file, "w", encoding="utf-8") as f:
        f.write(pdf_content)
    print("purchaseOrderPDF.ts updated (first pass regex).")

if __name__ == "__main__":
    main()
