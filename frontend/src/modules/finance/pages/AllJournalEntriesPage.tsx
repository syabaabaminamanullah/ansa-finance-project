import { useState, useEffect, useMemo, useRef } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { DatePicker } from '../../../components/ui/DatePicker';
import { ArrowLeft, Filter, Download, Paperclip, Upload, Eye, X, FileText, Image, MapPin, Building2, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, financeApi, financialsApi, projectsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

const API_BASE = (api.defaults.baseURL || '/api/v1') + '/finance';

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
  const baseApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://127.0.0.1:8000');

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
      await financeApi.updateJournalPartial(journal.journal_id, { [fieldType]: url });

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

export function AllJournalEntriesPage() {
  const [journals, setJournals] = useState<Journal[]>(() => {
    try {
      const cached = sessionStorage.getItem('ansa_all_journals_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [coas, setCoas] = useState<COA[]>(() => {
    try {
      const cached = sessionStorage.getItem('ansa_coas_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const cached = sessionStorage.getItem('ansa_projects_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [selectedAttachmentEntry, setSelectedAttachmentEntry] = useState<{entry: FlatEntry, fieldType: 'attachment_path' | 'attachment_path_2'} | null>(null);

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('ansa_all_journals_cache');
    } catch {
      return true;
    }
  });
  const addToast = useToastStore((state) => state.addToast);

  const fetchData = async () => {
    try {
      if (!sessionStorage.getItem('ansa_all_journals_cache')) {
        setIsLoading(true);
      }
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

      try {
        sessionStorage.setItem('ansa_all_journals_cache', JSON.stringify(journalsRes.data));
        sessionStorage.setItem('ansa_coas_cache', JSON.stringify(sortedCoas));
        sessionStorage.setItem('ansa_projects_cache', JSON.stringify(projectsRes.data));
      } catch (_) {}
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

          {/* Attachment button 1 - Dokumen Dasar */}
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
        <div className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1.5 w-44">
            <label className="text-sm font-medium text-textPrimary flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary" /> Dari Tanggal
            </label>
            <DatePicker
              value={filterDateFrom}
              onChange={(val) => setFilterDateFrom(val)}
              placeholder="Pilih tanggal..."
            />
          </div>
          <div className="space-y-1.5 w-44">
            <label className="text-sm font-medium text-textPrimary">Sampai Tanggal</label>
            <DatePicker
              value={filterDateTo}
              onChange={(val) => setFilterDateTo(val)}
              placeholder="Pilih tanggal..."
            />
          </div>
          {(filterDateFrom || filterDateTo) && (
            <button
              type="button"
              onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
              className="px-3 py-2 text-xs font-semibold text-textSecondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors border border-border"
              title="Reset Filter Tanggal"
            >
              Reset
            </button>
          )}
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
          isLoading={isLoading}
        />
      </div>

      {/* Attachment Modal */}
      {selectedAttachmentEntry && (
        <AttachmentModal
          journal={selectedAttachmentEntry.entry}
          fieldType={selectedAttachmentEntry.fieldType}
          onClose={() => setSelectedAttachmentEntry(null)}
          onUploaded={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
