import os

path = os.path.join('frontend', 'src', 'modules', 'finance', 'pages', 'AllJournalEntriesPage.tsx')
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_modal_comp = """// Modal component for viewing/uploading attachment
function AttachmentModal({
  journal,
  fieldType,
  onClose,
  onUploaded
}: {
  journal: FlatEntry;
  fieldType: 'attachment_path' | 'attachment_path_2';
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);
  const baseApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const getPreviewUrl = (path: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads/')) return `${baseApiUrl}${path}`;
    return `${baseApiUrl}/api/v1/finance/attachments/${path}`;
  };

  const currentPath = fieldType === 'attachment_path' ? journal.attachment_path : (journal as any).attachment_path_2;
  const previewUrl = getPreviewUrl(currentPath || null);
  const isPdf = currentPath?.toLowerCase().endsWith('.pdf');
  const title = fieldType === 'attachment_path' ? 'Bukti Pengeluaran Kas (Transfer)' : 'Dokumen Dasar (Invoice/SPD)';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const res = await financeApi.uploadFile(file);
      const url = res.data.url;
      await financeApi.updateJournal(journal.journal_id, { [fieldType]: url });

      addToast('success', 'Upload Berhasil', 'Dokumen berhasil diupload.');
      onUploaded();
      onClose(); // Just close to refresh
    } catch (err: any) {
      addToast('error', 'Upload Gagal', err.message || 'Gagal mengupload file.');
    } finally {
      setIsUploading(false);
    }
  };

  const openInNewTab = () => {
    if (previewUrl) window.open(previewUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-textPrimary">{title}</h2>
              <p className="text-xs text-textSecondary font-mono">{journal.journal_number} — {journal.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background text-textSecondary hover:text-textPrimary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="px-5 pt-4 pb-2 space-y-3">
          <div>
            <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide mb-1">Keterangan Otomatis:</p>
            <p className="text-sm text-textSecondary bg-background/50 rounded-lg p-3 border border-border">
              {journal.description || 'Tidak ada deskripsi.'}
            </p>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto p-5">
          {previewUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {isPdf ? (
                  <FileText className="w-5 h-5 text-danger" />
                ) : (
                  <Image className="w-5 h-5 text-success" />
                )}
                <span className="text-sm font-medium text-textPrimary">
                  {isPdf ? 'Dokumen PDF' : 'Gambar Dokumen'}
                </span>
                <button
                  onClick={openInNewTab}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors font-medium"
                >
                  <Eye className="w-3.5 h-3.5" /> Lihat Penuh
                </button>
              </div>

              {isPdf ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[50vh] rounded-xl border border-border"
                  title="Document PDF"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Document"
                  className="w-full max-h-[50vh] object-contain rounded-xl border border-border bg-background"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-textSecondary border-2 border-dashed border-border rounded-xl">
              <Upload className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium text-textPrimary">Belum ada dokumen</p>
              <p className="text-sm mt-1">Klik tombol di bawah untuk mengupload</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-border bg-muted/20 flex justify-between items-center rounded-b-2xl">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-border hover:bg-border text-textPrimary rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {previewUrl ? 'Ganti Dokumen' : 'Upload Dokumen'}
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-sm transition-all shadow-sm hover:shadow active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

"""

new_lines = lines[:51] + [new_modal_comp] + lines[280:]
content = "".join(new_lines)

# Now apply other fixes safely
# 1. Update state
content = content.replace(
    "const [selectedAttachmentEntry, setSelectedAttachmentEntry] = useState<FlatEntry | null>(null);",
    "const [selectedAttachmentEntry, setSelectedAttachmentEntry] = useState<{entry: FlatEntry, fieldType: 'attachment_path' | 'attachment_path_2'} | null>(null);"
)

# 2. Update Column
column_old = """          {/* Attachment button */}
          <button
            onClick={() => setSelectedAttachmentEntry(row)}
            title={row.attachment_path ? 'Lihat/Ganti Bukti Transfer' : 'Upload Bukti Transfer'}
            className={`p-1.5 rounded-lg transition-all ${
              row.attachment_path
                ? 'bg-success/15 text-success hover:bg-success/25 border border-success/30'
                : 'bg-background text-textSecondary hover:bg-border hover:text-textPrimary border border-border'
            }`}
          >
            {row.attachment_path ? (
              <Paperclip className="w-3.5 h-3.5" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
          </button>"""

column_new = """          {/* Attachment button 1 - Dokumen Dasar */}
          <button
            onClick={() => setSelectedAttachmentEntry({entry: row, fieldType: 'attachment_path_2'})}
            title={(row as any).attachment_path_2 ? 'Lihat/Ganti Dokumen Dasar (Invoice/SPD)' : 'Upload Dokumen Dasar'}
            className={`p-1.5 rounded-lg transition-all ${
              (row as any).attachment_path_2
                ? 'bg-success/15 text-success hover:bg-success/25 border border-success/30'
                : 'bg-background text-textSecondary hover:bg-border hover:text-textPrimary border border-border'
            }`}
          >
            {(row as any).attachment_path_2 ? (
              <FileText className="w-3.5 h-3.5" />
            ) : (
              <FileText className="w-3.5 h-3.5 opacity-50" />
            )}
          </button>
          
          {/* Attachment button 2 - Bukti Transfer */}
          <button
            onClick={() => setSelectedAttachmentEntry({entry: row, fieldType: 'attachment_path'})}
            title={row.attachment_path ? 'Lihat/Ganti Bukti Transfer' : 'Upload Bukti Transfer'}
            className={`p-1.5 rounded-lg transition-all ${
              row.attachment_path
                ? 'bg-success/15 text-success hover:bg-success/25 border border-success/30'
                : 'bg-background text-textSecondary hover:bg-border hover:text-textPrimary border border-border'
            }`}
          >
            {row.attachment_path ? (
              <Paperclip className="w-3.5 h-3.5" />
            ) : (
              <Paperclip className="w-3.5 h-3.5 opacity-50" />
            )}
          </button>"""

content = content.replace(column_old, column_new)

# 3. Update the Modal Render
modal_render_old = """      {/* Attachment Modal */}
      {selectedAttachmentEntry && (
        <AttachmentModal
          journal={selectedAttachmentEntry}
          onClose={() => setSelectedAttachmentEntry(null)}
          onUploaded={() => {
            fetchData();
          }}
        />
      )}"""

modal_render_new = """      {/* Attachment Modal */}
      {selectedAttachmentEntry && (
        <AttachmentModal
          journal={selectedAttachmentEntry.entry}
          fieldType={selectedAttachmentEntry.fieldType}
          onClose={() => setSelectedAttachmentEntry(null)}
          onUploaded={() => {
            fetchData();
          }}
        />
      )}"""
content = content.replace(modal_render_old, modal_render_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
