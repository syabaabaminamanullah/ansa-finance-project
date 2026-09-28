import os
import re

path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'JournalPage.tsx')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace block 1 (Dokumen Dasar)
pattern1 = r'(<div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">)\s*<FileText className="w-6 h-6 text-textSecondary" />\s*<p className="text-xs text-textSecondary"><span className="text-primary font-medium">Klik untuk upload</span> Invoice/SPD</p>\s*</div>'

replacement1 = r"""<label className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'attachment_path_2')} disabled={isUploading} />
                    <FileText className={`w-6 h-6 ${formData.attachment_path_2 ? 'text-success' : 'text-textSecondary'}`} />
                    <p className="text-xs text-textSecondary"><span className="text-primary font-medium">{formData.attachment_path_2 ? 'File Terpilih' : 'Klik untuk upload'}</span> Invoice/SPD</p>
                  </label>"""

content = re.sub(pattern1, replacement1, content)


# Replace block 2 (Bukti Pengeluaran Kas)
pattern2 = r'(<div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">)\s*<CheckCircle className="w-6 h-6 text-textSecondary" />\s*<p className="text-xs text-textSecondary"><span className="text-primary font-medium">Klik untuk upload</span> Bukti Transfer</p>\s*</div>'

replacement2 = r"""<label className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                    <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, 'attachment_path')} disabled={isUploading} />
                    <CheckCircle className={`w-6 h-6 ${formData.attachment_path ? 'text-success' : 'text-textSecondary'}`} />
                    <p className="text-xs text-textSecondary"><span className="text-primary font-medium">{formData.attachment_path ? 'File Terpilih' : 'Klik untuk upload'}</span> Bukti Transfer</p>
                  </label>"""

content = re.sub(pattern2, replacement2, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace completed.")
