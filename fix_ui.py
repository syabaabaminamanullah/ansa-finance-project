import re

def insert_cards_into_expense():
    with open("frontend/src/modules/finance/pages/ExpensePage.tsx", "r", encoding="utf-8") as f:
        content = f.read()

    # Form Cards (inject before Submit buttons)
    form_cards = """            {/* Document Upload Section */}
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
            
            <div className="flex justify-end gap-3 pt-6 border-t border-border">"""
            
    content = re.sub(r'(\s*)<div className="flex justify-end gap-3 pt-6 border-t border-border">', r'\n' + form_cards, content)

    # View Cards (inject before previewPdf)
    view_cards = """            <div className="mt-6 border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-textPrimary mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Dokumen Pendukung (Attachments)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background border border-border rounded-lg flex items-start gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-textPrimary">Dokumen Dasar (Tagihan)</p>
                    <p className="text-xs text-textSecondary mb-2">Invoice / SPD / Perjanjian</p>
                    {editingItem.attachment_path_2 ? (
                      <button type="button" onClick={() => setPreviewPdf(editingItem.attachment_path_2 || null)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Lihat File
                      </button>
                    ) : (
                      <label className="text-xs font-semibold text-danger hover:underline flex items-center gap-1 cursor-pointer">
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleLateUpload(e, 'attachment_path_2', editingItem.id)} disabled={isUploading} />
                        <Upload className="w-3 h-3" /> Upload Susulan
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="p-3 bg-background border border-border rounded-lg flex items-start gap-3">
                  <div className="p-2 bg-success/10 text-success rounded-lg flex-shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-textPrimary">Bukti Pengeluaran Kas</p>
                    <p className="text-xs text-textSecondary mb-2">Bukti Transfer / Rekening Koran</p>
                    {editingItem.attachment_path ? (
                      <button type="button" onClick={() => setPreviewPdf(editingItem.attachment_path || null)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Lihat File
                      </button>
                    ) : (
                      <label className="text-xs font-semibold text-danger hover:underline flex items-center gap-1 cursor-pointer">
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleLateUpload(e, 'attachment_path', editingItem.id)} disabled={isUploading} />
                        <Upload className="w-3 h-3" /> Upload Susulan
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {previewPdf && ("""
            
    content = content.replace("{previewPdf && (", view_cards)
    
    with open("frontend/src/modules/finance/pages/ExpensePage.tsx", "w", encoding="utf-8") as f:
        f.write(content)

def patch_journal_view_modal():
    with open("frontend/src/modules/finance/pages/JournalPage.tsx", "r", encoding="utf-8") as f:
        content = f.read()
        
    old_dsr = """                    <p className="text-sm font-medium text-textPrimary">Dokumen Dasar (Tagihan)</p>
                    <p className="text-xs text-textSecondary mb-2">Invoice / SPD / Perjanjian</p>
                    <button type="button" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" /> Lihat File
                    </button>"""
    new_dsr = """                    <p className="text-sm font-medium text-textPrimary">Dokumen Dasar (Tagihan)</p>
                    <p className="text-xs text-textSecondary mb-2">Invoice / SPD / Perjanjian</p>
                    {editingItem.attachment_path_2 ? (
                      <button type="button" onClick={() => setPreviewPdf(editingItem.attachment_path_2 || null)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Lihat File
                      </button>
                    ) : (
                      <label className="text-xs font-semibold text-danger hover:underline flex items-center gap-1 cursor-pointer">
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleLateUpload(e, 'attachment_path_2', editingItem.id)} disabled={isUploading} />
                        <Upload className="w-3 h-3" /> Upload Susulan
                      </label>
                    )}"""
    content = content.replace(old_dsr, new_dsr)
    
    old_kas = """                    <p className="text-sm font-medium text-textPrimary">Bukti Pengeluaran Kas</p>
                    <p className="text-xs text-textSecondary mb-2">Bukti Transfer / Rekening Koran</p>
                    <button type="button" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      <Download className="w-3 h-3" /> Lihat File
                    </button>"""
    new_kas = """                    <p className="text-sm font-medium text-textPrimary">Bukti Pengeluaran Kas</p>
                    <p className="text-xs text-textSecondary mb-2">Bukti Transfer / Rekening Koran</p>
                    {editingItem.attachment_path ? (
                      <button type="button" onClick={() => setPreviewPdf(editingItem.attachment_path || null)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Lihat File
                      </button>
                    ) : (
                      <label className="text-xs font-semibold text-danger hover:underline flex items-center gap-1 cursor-pointer">
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleLateUpload(e, 'attachment_path', editingItem.id)} disabled={isUploading} />
                        <Upload className="w-3 h-3" /> Upload Susulan
                      </label>
                    )}"""
    content = content.replace(old_kas, new_kas)

    with open("frontend/src/modules/finance/pages/JournalPage.tsx", "w", encoding="utf-8") as f:
        f.write(content)

insert_cards_into_expense()
patch_journal_view_modal()
print("Fixed missing UI cards and buttons.")
