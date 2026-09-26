import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 1. Update initial formData to include attachment_path_2
    content = re.sub(
        r"(description:\s*'',\s*attachment_path:\s*'',)",
        r"\1\n    attachment_path_2: '',",
        content
    )
    
    # 2. Update handleFileUpload to take a field argument
    old_upload = r"""  const handleFileUpload = async \(e: React.ChangeEvent<HTMLInputElement>\) => {
    if \(!e.target.files \|\| !e.target.files\[0\]\) return;
    setIsUploading\(true\);
    try {
      const res = await financeApi.uploadFile\(e.target.files\[0\]\);
      setFormData\(prev => \(\{ \.\.\.prev, attachment_path: res.data.url \}\)\);
      addToast\('success', 'Upload Success', 'File attached successfully.'\);
    \} catch \(err: any\) {
      addToast\('error', 'Upload Failed', err.message\);
    \} finally {
      setIsUploading\(false\);
    \}
  \};"""
    
    new_upload = """  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'attachment_path' | 'attachment_path_2') => {
    if (!e.target.files || !e.target.files[0]) return;
    setIsUploading(true);
    try {
      const res = await financeApi.uploadFile(e.target.files[0]);
      setFormData(prev => ({ ...prev, [field]: res.data.url }));
      addToast('success', 'Upload Success', 'File attached successfully.');
    } catch (err: any) {
      addToast('error', 'Upload Failed', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLateUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'attachment_path' | 'attachment_path_2', id: string) => {
    if (!e.target.files || !e.target.files[0]) return;
    setIsUploading(true);
    try {
      const res = await financeApi.uploadFile(e.target.files[0]);
      const url = res.data.url;
      // Update via API
      if (filepath.includes("ExpensePage")) {
        await financeApi.updateExpense(id, { [field]: url });
      } else {
        await financeApi.updateJournal(id, { [field]: url });
      }
      setEditingItem(prev => prev ? { ...prev, [field]: url } : null);
      addToast('success', 'Upload Success', 'File attached successfully.');
      fetchData();
    } catch (err: any) {
      addToast('error', 'Upload Failed', err.message);
    } finally {
      setIsUploading(false);
    }
  };
  
  const [previewPdf, setPreviewPdf] = useState<string | null>(null);
  const baseApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');
"""
    # Replace handleFileUpload
    content = re.sub(old_upload, new_upload.replace('filepath.includes("ExpensePage")', 'true' if 'ExpensePage' in filepath else 'false'), content)
    
    # 3. Remove the generic Bukti PDF / Attachment I added in form
    generic_upload = r"""          <div className="space-y-1\.5">
            <label className="text-sm font-medium text-textPrimary">Bukti PDF / Attachment <span className="text-xs text-textSecondary">\(Opsional\)</span></label>
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                accept="\.pdf,image/\*" 
                onChange=\{handleFileUpload\} 
                disabled=\{isUploading\}
                className="block w-full md:w-1/3 text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              \{isUploading && <span className="text-xs text-textSecondary animate-pulse">Uploading\.\.\.</span>\}
            </div>
            \{formData\.attachment_path && \(
              <div className="text-xs text-success bg-success/10 px-2 py-1 rounded border border-success/20 inline-block mt-1">
                File terlampir: \{formData\.attachment_path\.split\('/'\)\.pop\(\)\}
              </div>
            \)\}
          </div>"""
    content = re.sub(generic_upload, "", content)
    
    # 4. Wire up the Upload Dokumen Pendukung cards in form
    # Dokumen Dasar (attachment_path_2)
    form_dokumen_dasar = r"""                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                    <FileText className="w-6 h-6 text-textSecondary" />
                    <p className="text-xs text-textSecondary"><span className="text-primary font-medium">Klik untuk upload</span> Invoice/SPD</p>
                  </div>"""
    new_form_dokumen_dasar = """                  <label className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'attachment_path_2')} disabled={isUploading} />
                    <FileText className={`w-6 h-6 ${formData.attachment_path_2 ? 'text-success' : 'text-textSecondary'}`} />
                    <p className="text-xs text-textSecondary"><span className="text-primary font-medium">{formData.attachment_path_2 ? 'File Terpilih' : 'Klik untuk upload'}</span> Invoice/SPD</p>
                  </label>"""
    content = content.replace(form_dokumen_dasar, new_form_dokumen_dasar)
    
    # Bukti Pengeluaran Kas (attachment_path)
    form_bukti_kas = r"""                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6 text-textSecondary" />
                    <p className="text-xs text-textSecondary"><span className="text-primary font-medium">Klik untuk upload</span> Bukti Transfer</p>
                  </div>"""
    new_form_bukti_kas = """                  <label className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'attachment_path')} disabled={isUploading} />
                    <CheckCircle className={`w-6 h-6 ${formData.attachment_path ? 'text-success' : 'text-textSecondary'}`} />
                    <p className="text-xs text-textSecondary"><span className="text-primary font-medium">{formData.attachment_path ? 'File Terpilih' : 'Klik untuk upload'}</span> Bukti Transfer</p>
                  </label>"""
    content = content.replace(form_bukti_kas, new_form_bukti_kas)
    
    # 5. Wire up the View Modal (Late Upload & View)
    view_dokumen_dasar = r"""                      <button type="button" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" /> Lihat File
                      </button>"""
    new_view_dokumen_dasar = """                      {editingItem.attachment_path_2 ? (
                        <button type="button" onClick={() => setPreviewPdf(editingItem.attachment_path_2 || null)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Lihat File
                        </button>
                      ) : (
                        <label className="text-xs font-semibold text-danger hover:underline flex items-center gap-1 cursor-pointer">
                          <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleLateUpload(e, 'attachment_path_2', editingItem.id)} disabled={isUploading} />
                          <Upload className="w-3 h-3" /> Upload Susulan
                        </label>
                      )}"""
    content = content.replace(view_dokumen_dasar, new_view_dokumen_dasar, 1) # Only first occurrence (Dokumen Dasar)
    
    # Bukti Pengeluaran Kas in View Modal
    view_bukti_kas = r"""                      <button type="button" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" /> Lihat File
                      </button>"""
    new_view_bukti_kas = """                      {editingItem.attachment_path ? (
                        <button type="button" onClick={() => setPreviewPdf(editingItem.attachment_path || null)} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Lihat File
                        </button>
                      ) : (
                        <label className="text-xs font-semibold text-danger hover:underline flex items-center gap-1 cursor-pointer">
                          <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleLateUpload(e, 'attachment_path', editingItem.id)} disabled={isUploading} />
                          <Upload className="w-3 h-3" /> Upload Susulan
                        </label>
                      )}"""
    content = content.replace(view_bukti_kas, new_view_bukti_kas, 1)
    
    # 6. Update the iframe preview section
    old_preview = r"""            \{editingItem\.attachment_path && \(
              <div className="bg-background border border-border rounded-lg mt-4 overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2 text-danger font-medium text-sm">
                    <FileText className="w-5 h-5" />
                    <span>Dokumen PDF</span>
                  </div>
                  <a 
                    href=\{`\$\{import\.meta\.env\.VITE_API_URL \|\| \(import\.meta\.env\.PROD \? '' : 'http://127\.0\.0\.1:8000'\)\}\$\{editingItem\.attachment_path\}`\} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Lihat Penuh</span>
                  </a>
                </div>
                <div className="h-\[400px\] w-full bg-muted/10">
                  <iframe 
                    src=\{`\$\{import\.meta\.env\.VITE_API_URL \|\| \(import\.meta\.env\.PROD \? '' : 'http://127\.0\.0\.1:8000'\)\}\$\{editingItem\.attachment_path\}`\} 
                    className="w-full h-full border-0" 
                    title="PDF Viewer"
                  />
                </div>
              </div>
            \)\}"""
            
    new_preview = """            {previewPdf && (
              <div className="bg-background border border-border rounded-lg mt-4 overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2 text-danger font-medium text-sm">
                    <FileText className="w-5 h-5" />
                    <span>Dokumen PDF</span>
                  </div>
                  <a 
                    href={`${baseApiUrl}${previewPdf}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Lihat Penuh</span>
                  </a>
                </div>
                <div className="h-[400px] w-full bg-muted/10">
                  <iframe 
                    src={`${baseApiUrl}${previewPdf}`} 
                    className="w-full h-full border-0" 
                    title="PDF Viewer"
                  />
                </div>
              </div>
            )}"""
    
    content = re.sub(old_preview, new_preview, content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

import sys
patch_file("frontend/src/modules/finance/pages/ExpensePage.tsx")
patch_file("frontend/src/modules/finance/pages/JournalPage.tsx")
print("Done patching UI")
