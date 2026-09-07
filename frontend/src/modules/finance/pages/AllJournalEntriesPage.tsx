import { useState, useEffect, useMemo, useRef } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { ArrowLeft, Filter, Download, Paperclip, Upload, Eye, X, FileText, Image, MapPin, Building2, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, financialsApi, projectsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

const API_BASE = 'http://localhost:8000/api/v1/finance';

interface COA {
  id: string;
  account_code: string;
  account_name: string;
}

interface JournalLine {
  id: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
}

interface Journal {
  id: string;
  journal_number: string;
  date: string;
  description: string;
  status: string;
  attachment_path?: string;
  attachment_memo?: string;
  lines: JournalLine[];
}

interface FlatEntry {
  id: string;
  journal_id: string;
  date: string;
  journal_number: string;
  status: string;
  description: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  is_first_line?: boolean;
  attachment_path?: string;
  attachment_memo?: string;
}

// Modal component for viewing/uploading attachment
function AttachmentModal({
  journal,
  onClose,
  onUploaded
}: {
  journal: FlatEntry;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [memo, setMemo] = useState(journal.attachment_memo || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const attachmentUrl = `${API_BASE}/journals/${journal.journal_id}/attachment`;

  const loadPreview = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(attachmentUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType(blob.type.includes('pdf') ? 'pdf' : 'image');
    } catch {
      // no attachment yet
    }
  };

  useEffect(() => {
    if (journal.attachment_path) {
      loadPreview();
    }
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/journals/${journal.journal_id}/attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Upload failed');
      }

      addToast('success', 'Upload Berhasil', 'Bukti transfer berhasil diupload.');
      onUploaded();

      // Show preview immediately
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewType(file.type.includes('pdf') ? 'pdf' : 'image');
    } catch (err: any) {
      addToast('error', 'Upload Gagal', err.message || 'Gagal mengupload file. Pastikan format PDF/JPG/PNG.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveMemo = async () => {
    setIsSavingMemo(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/journals/${journal.journal_id}/memo`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo })
      });
      if (!res.ok) throw new Error('Save failed');
      addToast('success', 'Memo Tersimpan', 'Catatan berhasil disimpan.');
      onUploaded();
    } catch {
      addToast('error', 'Gagal', 'Gagal menyimpan memo.');
    } finally {
      setIsSavingMemo(false);
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
              <Paperclip className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-textPrimary">Bukti Transaksi</h2>
              <p className="text-xs text-textSecondary font-mono">{journal.journal_number} — {journal.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background text-textSecondary hover:text-textPrimary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description + Memo */}
        <div className="px-5 pt-4 pb-2 space-y-3">
          <div>
            <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide mb-1">Keterangan Otomatis:</p>
            <p className="text-sm text-textSecondary bg-background/50 rounded-lg p-3 border border-border">
              {journal.description}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide mb-1.5">Memo Tambahan:</p>
            <div className="flex gap-2.5 items-stretch">
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                placeholder="Contoh: Bukti TF ini mencakup 3 transaksi — Ronny Rp11jt, Asep Rp10jt, Basriyanto Rp15jt..."
                className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-textPrimary resize-none placeholder:text-textSecondary/40 transition-all shadow-xs"
              />
              <button
                onClick={handleSaveMemo}
                disabled={isSavingMemo}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5 shrink-0 self-stretch"
                title="Simpan Memo"
              >
                {isSavingMemo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto p-5">
          {previewUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {previewType === 'pdf' ? (
                  <FileText className="w-5 h-5 text-danger" />
                ) : (
                  <Image className="w-5 h-5 text-success" />
                )}
                <span className="text-sm font-medium text-textPrimary">
                  {previewType === 'pdf' ? 'Dokumen PDF' : 'Gambar Bukti Transfer'}
                </span>
                <button
                  onClick={openInNewTab}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors font-medium"
                >
                  <Eye className="w-3.5 h-3.5" /> Lihat Penuh
                </button>
              </div>

              {previewType === 'image' ? (
                <img
                  src={previewUrl}
                  alt="Bukti Transfer"
                  className="w-full max-h-[50vh] object-contain rounded-xl border border-border bg-background"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-[50vh] rounded-xl border border-border"
                  title="Bukti Transfer PDF"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-textSecondary border-2 border-dashed border-border rounded-xl">
              <Paperclip className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium text-textPrimary">Belum ada bukti transfer</p>
              <p className="text-sm mt-1">Upload file PDF atau gambar (JPG, PNG) di bawah</p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="p-5 border-t border-border">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground rounded-xl font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            {isUploading
              ? 'Mengupload...'
              : journal.attachment_path
              ? 'Ganti Bukti Transfer'
              : 'Upload Bukti Transfer (PDF/JPG/PNG)'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AllJournalEntriesPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [coas, setCoas] = useState<COA[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedAttachmentEntry, setSelectedAttachmentEntry] = useState<FlatEntry | null>(null);

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [_isLoading, setIsLoading] = useState(true);
  const addToast = useToastStore((state) => state.addToast);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [journalsRes, coasRes, projectsRes] = await Promise.all([
        financeApi.getJournals(),
        financialsApi.getCoas(),
        projectsApi.getProjects()
      ]);
      setJournals(journalsRes.data);
      setProjects(projectsRes.data);
      const sortedCoas = [...coasRes.data].sort((a: any, b: any) => {
        const codeA = String(a.account_code || a.code || '');
        const codeB = String(b.account_code || b.code || '');
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setCoas(sortedCoas);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch journal data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const flatEntries = useMemo(() => {
    const entries: FlatEntry[] = [];
    journals.forEach(journal => {
      if (filterDateFrom && journal.date < filterDateFrom) return;
      if (filterDateTo && journal.date > filterDateTo) return;

      journal.lines.forEach(line => {
        const account = coas.find(c => c.id === line.account_id);
        const proj = projects.find(p => p.id === line.project_id);
        entries.push({
          id: line.id,
          journal_id: journal.id,
          date: journal.date,
          journal_number: journal.journal_number,
          status: journal.status,
          description: line.description || journal.description || '-',
          account_code: account?.account_code || 'Unknown',
          account_name: account?.account_name || 'Unknown',
          debit: line.debit,
          credit: line.credit,
          attachment_path: journal.attachment_path,
          attachment_memo: journal.attachment_memo,
          project_id: line.project_id,
          project_name: proj ? proj.name : 'Overhead (OH)',
          project_code: proj ? proj.code : 'OH'
        });
      });
    });

    entries.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      if (a.journal_number !== b.journal_number) return a.journal_number.localeCompare(b.journal_number);
      return b.debit - a.debit;
    });

    for (let i = 0; i < entries.length; i++) {
      if (i === 0 || entries[i].journal_number !== entries[i - 1].journal_number) {
        entries[i].is_first_line = true;
      } else {
        entries[i].is_first_line = false;
      }
    }

    return entries;
  }, [journals, coas, filterDateFrom, filterDateTo]);

  const formatCurrency = (val: number) => {
    if (val === 0) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const columns = [
    {
      header: 'Date',
      accessor: (row: FlatEntry) => row.is_first_line ? row.date : '',
      className: 'w-24 whitespace-nowrap text-textSecondary text-xs'
    },
    {
      header: 'Journal No.',
      accessor: (row: FlatEntry) => row.is_first_line ? row.journal_number : '',
      className: 'font-mono text-primary font-bold w-36 whitespace-nowrap text-xs'
    },
    {
      header: 'Account',
      accessor: (row: FlatEntry) => (
        <div className={!row.is_first_line ? "pl-4 border-l-2 border-border/50" : ""}>
          <span className="font-mono font-medium block sm:inline">{row.account_code}</span>
          <span className="sm:ml-2 text-textSecondary text-xs">{row.account_name}</span>
        </div>
      ),
      className: 'min-w-[150px] w-1/4 whitespace-normal break-words'
    },
    {
      header: 'Description',
      accessor: 'description' as keyof FlatEntry,
      className: 'min-w-[150px] w-1/4 whitespace-normal break-words text-xs'
    },
    {
      header: 'Tag Proyek / Lokasi',
      accessor: (row: FlatEntry) => (
        row.project_id ? (
          <span
            title={`${row.project_code} - ${row.project_name || 'Proyek Lapangan'}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold tracking-tight bg-gradient-to-r from-emerald-50 to-teal-50/90 text-emerald-800 border border-emerald-300/80 shadow-[0_1px_2px_rgba(5,150,105,0.08)] hover:border-emerald-500 hover:shadow-sm transition-all cursor-default select-none whitespace-nowrap"
          >
            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>{row.project_code}</span>
          </span>
        ) : (
          <span
            title="Overhead (Non-Project / Head Office Operation)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100/90 text-slate-600 border border-slate-200/90 shadow-sm whitespace-nowrap cursor-default select-none"
          >
            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Overhead</span>
          </span>
        )
      ),
      className: 'w-36 whitespace-nowrap text-xs'
    },
    {
      header: 'Debit',
      accessor: (row: FlatEntry) => formatCurrency(row.debit),
      className: 'text-right min-w-[130px] whitespace-nowrap font-medium text-xs'
    },
    {
      header: 'Credit',
      accessor: (row: FlatEntry) => formatCurrency(row.credit),
      className: 'text-right min-w-[130px] whitespace-nowrap font-medium text-textSecondary text-xs'
    },
    {
      header: 'Status / Bukti',
      accessor: (row: FlatEntry) => row.is_first_line ? (
        <div className="flex items-center gap-1.5 justify-center flex-wrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleJournalStatus(row.journal_id, row.status);
            }}
            className={`group/btn px-3 py-1 rounded text-[10px] font-bold uppercase transition-all shadow-sm w-[70px] text-center cursor-pointer ${
              row.status === 'Posted'
                ? 'bg-success/10 text-success border border-success/20 hover:bg-warning hover:text-white hover:border-warning'
                : 'bg-warning/10 text-warning border border-warning/20 hover:bg-success hover:text-white hover:border-success'
            }`}
            title={row.status === 'Posted' ? 'Click to Unpost' : 'Click to Post'}
          >
            <span className="block group-hover/btn:hidden">{row.status}</span>
            <span className="hidden group-hover/btn:block">{row.status === 'Posted' ? 'Unpost' : 'Post'}</span>
          </button>

          {/* Attachment button */}
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
          </button>
        </div>
      ) : '',
      className: 'w-36 text-center whitespace-nowrap'
    }
  ];

  const toggleJournalStatus = async (journalId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Posted' ? 'Draft' : 'Posted';
      await financeApi.updateJournalStatus(journalId, { status: newStatus });
      addToast('success', 'Status Updated', `Journal status changed to ${newStatus}`);
      fetchData();
    } catch (e) {
      addToast('error', 'Error', 'Failed to update journal status');
    }
  };

  const handleDownloadCSV = () => {
    if (flatEntries.length === 0) {
      addToast('warning', 'No Data', 'There is no data to download.');
      return;
    }

    const headers = ['Date', 'Journal No.', 'Account Code', 'Account Name', 'Description', 'Debit', 'Credit', 'Status', 'Has Attachment'];
    const csvContent = [
      headers.join(','),
      ...flatEntries.map(e => [
        e.date,
        e.journal_number,
        e.account_code,
        `"${e.account_name}"`,
        `"${e.description}"`,
        e.debit,
        e.credit,
        e.status,
        e.attachment_path ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `All_Journals_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col min-w-0 w-full overflow-hidden">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">All Journal Entries</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">All Journals</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-4 items-end justify-between shadow-sm">
        <div className="flex gap-4 flex-wrap">
          <div className="space-y-1.5 min-w-[150px]">
            <label className="text-sm font-medium text-textPrimary flex items-center gap-2">
              <Filter className="w-4 h-4" /> From Date
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
            />
          </div>
          <div className="space-y-1.5 min-w-[150px]">
            <label className="text-sm font-medium text-textPrimary">To Date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-textSecondary">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-success/40 border border-success/60 inline-block"></span>
              Ada Bukti
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-border inline-block"></span>
              Belum Ada
            </span>
          </div>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 min-w-0">
        <DataTable
          title="Journal Entries Detail"
          description="Klik ikon 📎 untuk upload atau lihat bukti transfer."
          columns={columns}
          data={flatEntries}
          searchPlaceholder="Search journal no, account, description..."
          groupBy={(row) => row.date}
        />
      </div>

      {/* Attachment Modal */}
      {selectedAttachmentEntry && (
        <AttachmentModal
          journal={selectedAttachmentEntry}
          onClose={() => setSelectedAttachmentEntry(null)}
          onUploaded={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
