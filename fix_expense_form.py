import re

def fix_expense_form():
    with open("frontend/src/modules/finance/pages/ExpensePage.tsx", "r", encoding="utf-8") as f:
        content = f.read()

    form_cards = """          {/* Document Upload Section */}
          <div className="mt-6 border border-border rounded-lg p-4 bg-muted/20">
            <h4 className="text-sm font-semibold text-textPrimary mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Upload Dokumen Pendukung
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-textSecondary">1. Dokumen Dasar / Tagihan (Wajib)</label>
                <label className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'attachment_path_2')} disabled={isUploading} />
                  <FileText className={`w-6 h-6 ${formData.attachment_path_2 ? 'text-success' : 'text-textSecondary'}`} />
                  <p className="text-xs text-textSecondary"><span className="text-primary font-medium">{formData.attachment_path_2 ? 'File Terpilih' : 'Klik untuk upload'}</span> Invoice/SPD</p>
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-textSecondary">2. Bukti Pengeluaran Kas (Wajib)</label>
                <label className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'attachment_path')} disabled={isUploading} />
                  <CheckCircle className={`w-6 h-6 ${formData.attachment_path ? 'text-success' : 'text-textSecondary'}`} />
                  <p className="text-xs text-textSecondary"><span className="text-primary font-medium">{formData.attachment_path ? 'File Terpilih' : 'Klik untuk upload'}</span> Bukti Transfer</p>
                </label>
              </div>
            </div>
            <p className="text-[10px] text-textSecondary mt-3 italic">* Mengunggah dokumen dasar dan bukti bayar diwajibkan untuk mematuhi standar audit keuangan perusahaan.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">"""
          
    content = content.replace('<div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">', form_cards, 1)

    with open("frontend/src/modules/finance/pages/ExpensePage.tsx", "w", encoding="utf-8") as f:
        f.write(content)

fix_expense_form()
print("Fixed Expense Form")
