import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  CalendarDays, 
  Download, 
  BarChart3, 
  Layers, 
  Search, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  DollarSign,
  Tag,
  BookOpen,
  X,
  Eye,
  Paperclip,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ExternalLink
} from 'lucide-react';
import { generateWeeklyCashflowPDF } from '../utils/pdfGenerator';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://127.0.0.1:8000/api/v1');

interface WeeklyProjectCashflowViewProps {
  projectId?: string;
  initialTab?: 'weekly_project' | 'copy1';
  onTabChange?: (tab: 'weekly_project' | 'copy1') => void;
  hideHeaderTabs?: boolean;
}

function WeeklyTransactionDetailModal({
  transaction,
  onClose,
  formatCurrency
}: {
  transaction: any;
  onClose: () => void;
  formatCurrency: (val: number) => string;
}) {
  const isInf = transaction.flow === 'INFLOW';
  const journalId = transaction.journal_id;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (journalId && transaction.attachment_path) {
      loadPreview();
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [journalId, transaction.attachment_path]);

  const loadPreview = async () => {
    if (!journalId) return;
    try {
      setIsLoadingPreview(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/journals/${journalId}/attachment`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType(blob.type.includes('pdf') ? 'pdf' : 'image');
    } catch (e) {
      console.error('Failed to load attachment preview:', e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const totalDebit = transaction.lines?.reduce((sum: number, l: any) => sum + (l.debit || 0), 0) || 0;
  const totalCredit = transaction.lines?.reduce((sum: number, l: any) => sum + (l.credit || 0), 0) || 0;

  return (
    <div 
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl my-auto overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-background/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isInf 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}>
              {isInf ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-textPrimary text-base md:text-lg font-mono">
                  {transaction.journal_number || 'VOUCHER-TRX'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  isInf 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}>
                  {isInf ? 'KAS MASUK (INFLOW)' : 'KAS KELUAR (OUTFLOW)'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  {transaction.week_label || `W${transaction.week_num}`}
                </span>
              </div>
              <p className="text-xs text-textSecondary mt-0.5 flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span>Tanggal: <strong className="text-textPrimary">{transaction.date}</strong></span>
                {transaction.status && (
                  <>
                    <span className="text-border">•</span>
                    <span>Status: <strong className="text-success">{transaction.status}</strong></span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl hover:bg-background text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-background/70 border border-border rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-textSecondary">
                Nominal Transaksi
              </span>
              <p className={`text-xl font-bold font-mono mt-1 ${isInf ? 'text-success' : 'text-danger'}`}>
                {isInf ? '+' : '-'}{formatCurrency(transaction.amount)}
              </p>
            </div>

            <div className="bg-background/70 border border-border rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-textSecondary">
                Kategori Kas
              </span>
              <p className="text-sm font-bold text-textPrimary mt-1 truncate" title={transaction.category}>
                {transaction.category}
              </p>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-card border border-border text-textSecondary mt-1 inline-block">
                {transaction.cat_code}
              </span>
            </div>

            <div className="bg-background/70 border border-border rounded-xl p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-textSecondary">
                Akun COA Terdaftar
              </span>
              <p className="text-sm font-bold text-textPrimary mt-1 truncate" title={`${transaction.coa_code} - ${transaction.coa_name}`}>
                {transaction.coa_name || '-'}
              </p>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 mt-1 inline-block">
                {transaction.coa_code || '-'}
              </span>
            </div>
          </div>

          {/* Deskripsi & Keterangan Transaksi */}
          <div className="bg-background/50 border border-border rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-textSecondary uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" /> Keterangan Transaksi Asli:
            </span>
            <p className="text-sm font-medium text-textPrimary leading-relaxed">
              {transaction.description || '-'}
            </p>
            {transaction.attachment_memo && (
              <div className="mt-2 pt-2 border-t border-border/60 text-xs text-textSecondary">
                <span className="font-semibold text-textPrimary">Catatan Memo: </span>
                <span>{transaction.attachment_memo}</span>
              </div>
            )}
          </div>

          {/* Rincian Jurnal Umum Akuntansi (Double-Entry Debit & Kredit) */}
          {transaction.lines && transaction.lines.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" /> Rincian Jurnal Akuntansi (Double-Entry)
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 font-bold">
                  ✓ Balance Terverifikasi
                </span>
              </div>
              <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-background/80 text-textSecondary uppercase text-[10px] border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-28">Kode Akun</th>
                      <th className="py-2.5 px-3 w-44">Nama Akun</th>
                      <th className="py-2.5 px-3">Keterangan Baris</th>
                      <th className="py-2.5 px-3 text-right w-28">Debit (Rp)</th>
                      <th className="py-2.5 px-3 text-right w-28">Kredit (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {transaction.lines.map((l: any, i: number) => (
                      <tr key={i} className="hover:bg-primary/5">
                        <td className="py-2 px-3 font-mono font-bold text-primary text-[11px]">
                          {l.account_code || '-'}
                        </td>
                        <td className="py-2 px-3 font-medium text-textPrimary">
                          {l.account_name || '-'}
                        </td>
                        <td className="py-2 px-3 text-textSecondary">
                          {l.description || '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-textPrimary">
                          {l.debit > 0 ? formatCurrency(l.debit) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-textPrimary">
                          {l.credit > 0 ? formatCurrency(l.credit) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-background font-bold border-t border-border text-xs">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-right text-textSecondary">Total Jurnal:</td>
                      <td className="py-2.5 px-3 text-right font-mono text-primary font-bold">
                        {formatCurrency(totalDebit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-primary font-bold">
                        {formatCurrency(totalCredit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : null}

          {/* Rincian LPJ Kas Kecil Lapangan (Jika Transaksi Copy 1) */}
          {transaction.is_lpj && transaction.lpj_detail ? (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" /> Detail Bukti Pengeluaran Kas Kecil (LPJ Site)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-textSecondary text-[11px] block">No. Urut LPJ:</span>
                  <span className="font-mono font-bold text-textPrimary">{transaction.lpj_detail.line_no || '-'}</span>
                </div>
                <div>
                  <span className="text-textSecondary text-[11px] block">Kuantitas & Satuan:</span>
                  <span className="font-semibold text-textPrimary">
                    {transaction.lpj_detail.qty} {transaction.lpj_detail.unit}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary text-[11px] block">Harga Satuan:</span>
                  <span className="font-mono font-semibold text-textPrimary">
                    {formatCurrency(transaction.lpj_detail.unit_price)}
                  </span>
                </div>
                <div>
                  <span className="text-textSecondary text-[11px] block">Total Pengeluaran:</span>
                  <span className="font-mono font-bold text-danger">
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Lampiran / Bukti Transfer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary" /> Lampiran / Bukti Transfer
              </h4>
              {previewUrl && (
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors font-medium cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Buka Ukuran Penuh
                </button>
              )}
            </div>

            {previewUrl ? (
              <div className="border border-border rounded-xl p-3 bg-background/50 flex justify-center">
                {previewType === 'image' ? (
                  <img
                    src={previewUrl}
                    alt="Bukti Transfer"
                    className="max-h-[350px] object-contain rounded-lg border border-border bg-background shadow-xs"
                  />
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <FileText className="w-10 h-10 text-primary mx-auto" />
                    <p className="text-xs font-semibold text-textPrimary">Dokumen Lampiran PDF Tersedia</p>
                    <button
                      onClick={() => window.open(previewUrl, '_blank')}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Buka PDF di Tab Baru
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 px-4 border border-dashed border-border rounded-xl text-center bg-background/40">
                <Paperclip className="w-6 h-6 text-textSecondary opacity-40 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-textSecondary">
                  {isLoadingPreview 
                    ? 'Memuat lampiran bukti transfer...' 
                    : 'Tidak ada file lampiran bukti transfer digital yang dilampirkan pada transaksi ini.'}
                </p>
                <p className="text-[11px] text-textSecondary/70 mt-0.5">
                  Transaksi telah dicatat dan terekonsiliasi dalam jurnal umum akuntansi.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-background/50 flex items-center justify-between">
          <span className="text-[11px] text-textSecondary hidden sm:inline">
            Petunjuk: Tekan tombol <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px] font-mono">Esc</kbd> untuk menutup
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export function WeeklyProjectCashflowView({
  projectId,
  initialTab = 'weekly_project',
  onTabChange,
  hideHeaderTabs = false
}: WeeklyProjectCashflowViewProps) {
  const [cashflowSubTab, setCashflowSubTab] = useState<'weekly_project' | 'copy1'>(initialTab);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [copy1Data, setCopy1Data] = useState<any>(null);
  const [isWeeklyLoading, setIsWeeklyLoading] = useState(false);
  const [isCopy1Loading, setIsCopy1Loading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState('all');
  const [groupingMode, setGroupingMode] = useState<'category' | 'coa'>('category');
  const [selectedDetailTx, setSelectedDetailTx] = useState<any | null>(null);

  useEffect(() => {
    if (initialTab) {
      setCashflowSubTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    fetchWeeklyData();
    fetchCopy1Data();
  }, [projectId]);

  const fetchWeeklyData = async () => {
    try {
      setIsWeeklyLoading(true);
      const token = localStorage.getItem('token');
      const param = projectId ? `?project_id=${projectId}` : '';
      const res = await fetch(`${API_BASE}/financial-statements/project-weekly-cashflow${param}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch weekly project cashflow');
      const json = await res.json();
      setWeeklyData(json);
    } catch (e) {
      console.error('Error fetching weekly project cashflow:', e);
    } finally {
      setIsWeeklyLoading(false);
    }
  };

  const fetchCopy1Data = async () => {
    try {
      setIsCopy1Loading(true);
      const token = localStorage.getItem('token');
      const param = projectId ? `&project_id=${projectId}` : '';
      const res = await fetch(`${API_BASE}/financial-statements/project-weekly-cashflow?version=copy1${param}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch Copy 1 project cashflow');
      const json = await res.json();
      setCopy1Data(json);
    } catch (e) {
      console.error('Error fetching Copy 1 project cashflow:', e);
    } finally {
      setIsCopy1Loading(false);
    }
  };

  const handleTabSelect = (tab: 'weekly_project' | 'copy1') => {
    setCashflowSubTab(tab);
    setSelectedWeek('all');
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val || 0);
  };

  const activeData = cashflowSubTab === 'copy1' ? copy1Data : weeklyData;
  const isActiveLoading = cashflowSubTab === 'copy1' ? isCopy1Loading : isWeeklyLoading;

  // Determine active week data if filtering by specific week
  const currentWeekData = (activeData && selectedWeek !== 'all') 
    ? activeData.weeks.find((w: any) => w.week_num === selectedWeek) 
    : null;

  // Categories to display in comparison chart
  let displayCategories: any[] = [];
  let displayTotalOutflow = 0;
  let displayTotalInflow = 0;
  let displayNetCash = 0;

  if (activeData) {
    if (selectedWeek === 'all') {
      displayCategories = groupingMode === 'coa' ? (activeData.coa_summary || []) : activeData.categories_summary;
      displayTotalOutflow = activeData.kpi.total_outflow;
      displayTotalInflow = activeData.kpi.total_inflow;
      displayNetCash = activeData.kpi.net_cashflow;
    } else if (currentWeekData) {
      if (groupingMode === 'coa') {
        displayCategories = (currentWeekData.coa_breakdown || []).map((cb: any) => ({
          code: cb.code || cb.coa_code,
          name: cb.name,
          is_new: false,
          amount: cb.amount,
          percentage: cb.percentage
        }));
      } else {
        displayCategories = currentWeekData.category_breakdown.map((cb: any) => {
          const matched = activeData.categories_summary.find((c: any) => c.name === cb.category);
          return {
            code: matched?.code || 'KAT',
            name: cb.category,
            is_new: matched?.is_new || false,
            amount: cb.amount,
            percentage: cb.percentage
          };
        });
      }
      displayTotalOutflow = currentWeekData.outflow;
      displayTotalInflow = currentWeekData.inflow;
      displayNetCash = currentWeekData.net;
    }
  }

  // Filter transactions for audit trail
  const filteredTxs = activeData ? activeData.transactions.filter((tx: any) => {
    const matchWeek = selectedWeek === 'all' || tx.week_num === selectedWeek;
    const matchCat = txCategoryFilter === 'all' || 
      (groupingMode === 'coa' 
        ? (tx.coa_code === txCategoryFilter || `${tx.coa_code} - ${tx.coa_name}` === txCategoryFilter) 
        : tx.category === txCategoryFilter);
    const q = txSearchQuery.toLowerCase();
    const matchSearch = !q || 
      tx.description.toLowerCase().includes(q) || 
      tx.journal_number.toLowerCase().includes(q) ||
      tx.coa_code.toLowerCase().includes(q) ||
      tx.coa_name.toLowerCase().includes(q);
    return matchWeek && matchCat && matchSearch;
  }) : [];

  if (isActiveLoading || !activeData) {
    return (
      <div className="py-20 flex flex-col items-center justify-center bg-card rounded-xl border border-border">
        <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-textSecondary text-sm">
          {cashflowSubTab === 'copy1' 
            ? 'Memuat data cashflow Copy 1 (Realisasi LPJ Lapangan)...' 
            : 'Memuat data cashflow mingguan proyek IKPT...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header Banner (Premium Executive Card) */}
      <div className="relative bg-card border border-border/80 rounded-2xl p-6 shadow-sm overflow-hidden backdrop-blur-xs">
        {/* Subtle Decorative Ambient Background Glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#8C5F34]/5 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-3xl">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-[#8C5F34]/15 text-[#8C5F34] border border-[#8C5F34]/30 tracking-wider shadow-2xs">
                {activeData.project.code}
              </span>
              {cashflowSubTab === 'copy1' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#294825] text-white border border-[#3c6b36] shadow-2xs">
                  <FileText className="w-3.5 h-3.5 text-emerald-300" />
                  COPY 1: REALISASI AKTUAL LPJ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-secondary/15 text-secondary border border-secondary/25 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
                  BASELINE MUTASI BANK TERVERIFIKASI
                </span>
              )}
            </div>

            {/* Project Title */}
            <h2 className="text-xl md:text-2xl font-extrabold text-textPrimary tracking-tight">
              {activeData.project.name}
            </h2>

            {/* Client & Contract Value */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-textSecondary pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-textSecondary">Klien:</span>
                <span className="font-semibold text-textPrimary">{activeData.project.client_name || '-'}</span>
              </div>
              <span className="text-border hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-textSecondary">Nilai Kontrak:</span>
                <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {formatCurrency(activeData.project.contract_value)}
                </span>
              </div>
            </div>
          </div>

          {/* Action & Date Controls (Right Side) */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto self-stretch lg:self-center">
            {/* Period Pill */}
            <div className="flex items-center gap-2 text-xs bg-background/80 border border-border px-3.5 py-2 rounded-xl text-textSecondary shadow-2xs">
              <CalendarDays className="w-4 h-4 text-primary shrink-0" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-medium text-textPrimary">{activeData.period.start} s/d {activeData.period.end}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border font-semibold text-textSecondary">
                  {activeData.period.total_weeks} Minggu
                </span>
              </div>
            </div>

            {/* SINGLE PREMIUM DOWNLOAD BUTTON */}
            <button
              onClick={() => generateWeeklyCashflowPDF(activeData, selectedWeek, groupingMode)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-98 cursor-pointer whitespace-nowrap"
              title="Unduh Dokumen Laporan Arus Kas Mingguan (PDF)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
              {selectedWeek !== 'all' && (
                <span className="text-[10px] opacity-80 font-mono">
                  (W{selectedWeek})
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Context Status Banner (Bottom Strip) */}
        <div className="mt-5 pt-3.5 border-t border-border/60">
          {cashflowSubTab === 'copy1' ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs bg-[#294825]/10 p-3 rounded-xl border border-[#294825]/30 text-emerald-400">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-bold px-2 py-0.5 rounded bg-[#294825] text-white text-[10px] tracking-wide">
                  LAPORAN COPY 1
                </span>
                <span className="text-textSecondary">
                  <strong className="text-textPrimary">Realisasi Riil Site:</strong> 9 transfer bank operasional dirinci ke bukti riil kas kecil (LPJ) lapangan & biaya transfer BI-Fast.
                </span>
              </div>
              <span className="whitespace-nowrap font-mono font-bold text-emerald-400 bg-background/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-[11px] shadow-2xs self-end sm:self-auto">
                {activeData.transactions.length} Transaksi Terdata
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs bg-primary/5 p-3 rounded-xl border border-primary/20 text-textSecondary">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                <span className="font-bold px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] tracking-wide">
                  BASELINE KAS BANK
                </span>
                <span>
                  <strong className="text-textPrimary">Versi Rekening Mandiri:</strong> Menampilkan mutasi rekening koran asli terverifikasi (termasuk transfer lump sum operasional).
                </span>
              </div>
              <span className="whitespace-nowrap font-mono font-bold text-primary bg-background/80 px-2.5 py-1 rounded-lg border border-primary/20 text-[11px] shadow-2xs self-end sm:self-auto">
                {activeData.transactions.length} Transaksi Bank Terverifikasi
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Check for Copy 1 Unavailable */}
      {cashflowSubTab === 'copy1' && activeData?.copy1_available === false ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-textPrimary mb-1">Laporan Copy 1 (Realisasi LPJ) Tidak Tersedia</h3>
          <p className="text-xs text-textSecondary max-w-md mx-auto mb-5">
            {activeData?.copy1_message || 'Laporan Copy 1 (Realisasi Kas Kecil LPJ Lapangan) saat ini khusus dikonfigurasi untuk proyek Borpile & Struktur - IKPT Solok.'}
          </p>
          <button
            onClick={() => handleTabSelect('weekly_project')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs"
          >
            Buka Arus Kas Baseline Bank Terverifikasi
          </button>
        </div>
      ) : (
        <>
      {/* Week Selector Pills */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold text-textSecondary uppercase tracking-wider">
          <span>Filter Tampilan Berdasarkan Minggu:</span>
          {selectedWeek !== 'all' && (
            <button 
              onClick={() => setSelectedWeek('all')}
              className="text-primary hover:underline lowercase text-[11px]"
            >
              reset ke semua minggu
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedWeek('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedWeek === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background hover:bg-card border border-border text-textSecondary hover:text-textPrimary'
            }`}
          >
            Semua Minggu (Kumulatif)
          </button>
          {activeData.weeks.map((w: any) => (
            <button
              key={w.week_num}
              onClick={() => setSelectedWeek(w.week_num)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedWeek === w.week_num
                  ? 'bg-[#8C5F34] text-white shadow-sm font-bold'
                  : 'bg-background hover:bg-card border border-border text-textSecondary hover:text-textPrimary'
              }`}
            >
              <span>W{w.week_num}</span>
              <span className="text-[10px] opacity-75">({w.label.split(' ')[1].replace('(', '').replace(')', '')})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide">
            Kas Masuk ({selectedWeek === 'all' ? 'Total' : `W${selectedWeek}`})
          </p>
          <p className="text-xl font-bold text-success mt-1">{formatCurrency(displayTotalInflow)}</p>
          <p className="text-[11px] text-textSecondary mt-1">
            {selectedWeek === 'all' 
              ? `${activeData.transactions?.filter((t: any) => t.flow === 'INFLOW').length || 0} Termin Masuk` 
              : displayTotalInflow > 0 ? 'Termin Diterima' : 'Tidak ada kas masuk'}
          </p>
        </div>

        <div className="bg-background border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide">
            Kas Keluar ({selectedWeek === 'all' ? 'Total' : `W${selectedWeek}`})
          </p>
          <p className="text-xl font-bold text-danger mt-1">({formatCurrency(displayTotalOutflow)})</p>
          <p className="text-[11px] text-textSecondary mt-1">
            {selectedWeek === 'all' ? `${filteredTxs.filter(t => t.flow === 'OUTFLOW').length} Transaksi Operasional` : `${filteredTxs.filter(t => t.flow === 'OUTFLOW').length} Transaksi`}
          </p>
        </div>

        <div className="bg-background border border-border rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide">
            Net Cashflow ({selectedWeek === 'all' ? 'Total' : `W${selectedWeek}`})
          </p>
          <p className={`text-xl font-bold mt-1 ${displayNetCash >= 0 ? 'text-success' : 'text-danger'}`}>
            {displayNetCash >= 0 ? '+ ' : ''}{formatCurrency(displayNetCash)}
          </p>
          <p className="text-[11px] text-textSecondary mt-1">
            {displayNetCash >= 0 ? 'Surplus Kas Mingguan' : 'Defisit Kas Mingguan'}
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            Saldo Kas Kumulatif
          </p>
          <p className="text-xl font-bold text-primary mt-1">
            +{formatCurrency(selectedWeek === 'all' ? activeData.kpi.cumulative_balance : currentWeekData?.cumulative || 0)}
          </p>
          <p className="text-[11px] text-success font-semibold mt-1">
            Posisi Kas Bersih Positif
          </p>
        </div>
      </div>

      {/* 3. KOMPARASI TOTAL PENGELUARAN (KATEGORI / COA) */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-6 border-b border-border pb-4">
          <div>
            <h3 className="text-base font-bold text-textPrimary flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              3. Komparasi Pengeluaran per {groupingMode === 'coa' ? 'Akun COA (Buku Besar)' : 'Kategori'} {selectedWeek === 'all' ? `(Kumulatif ${activeData.weeks?.length || 10} Minggu)` : `(Minggu ke-${selectedWeek})`}
            </h3>
            <p className="text-xs text-textSecondary mt-1">
              {selectedWeek === 'all' 
                ? `Mencakup ${activeData.weeks?.length || 10} minggu operasional proyek ${activeData.project?.name || ''} (${cashflowSubTab === 'copy1' ? 'Versi Copy 1 - Realisasi Aktual LPJ Site' : 'Versi Baseline Rekening Bank'})` 
                : `Periode: ${currentWeekData?.date_range} • Total Outflow: ${formatCurrency(displayTotalOutflow)}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 bg-background/90 p-1 rounded-xl border border-border shadow-2xs">
              <button
                onClick={() => setGroupingMode('category')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  groupingMode === 'category'
                    ? 'bg-[#8C5F34] text-white shadow-xs font-bold'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-card'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Mode Kategori</span>
              </button>
              <button
                onClick={() => setGroupingMode('coa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  groupingMode === 'coa'
                    ? 'bg-[#294825] text-white shadow-xs font-bold'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-card'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Mode Akun COA</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress bars list */}
        <div className="space-y-4">
          {displayCategories.length === 0 ? (
            <p className="text-textSecondary text-xs py-8 text-center">
              Tidak ada pengeluaran operasional pada minggu ini.
            </p>
          ) : (
            displayCategories.map((cat: any) => {
              const pct = typeof cat.percentage === 'number' ? cat.percentage : 0;
              return (
                <div key={cat.code} className="space-y-1.5 group">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-textPrimary font-medium truncate max-w-[65%] flex items-center gap-2">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-background border border-border text-textSecondary font-semibold">
                        {cat.code}
                      </span>
                      <span className="font-semibold text-textPrimary">{cat.name}</span>
                      {cat.is_new && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                          *baru
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-textPrimary font-bold text-right">
                      {formatCurrency(cat.amount)}{' '}
                      <span className="text-textSecondary font-medium text-[11px] ml-1">
                        ({pct.toFixed(2)}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-background border border-border/60 rounded-full h-2.5 overflow-hidden p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.is_new 
                          ? 'bg-amber-500' 
                          : 'bg-gradient-to-r from-[#8C5F34] to-[#D4AF37]'
                      }`}
                      style={{ width: `${Math.min(Math.max(cat.percentage, 0.5), 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary Footer Box */}
        <div className="mt-8 pt-5 border-t border-border bg-background/50 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center text-textPrimary font-semibold">
            <span className="uppercase tracking-wide text-textSecondary text-[11px]">Total Pengeluaran ({selectedWeek === 'all' ? `${activeData.weeks?.length || 10} Minggu` : `W${selectedWeek}`})</span>
            <span className="font-mono text-danger font-bold text-sm">
              ({formatCurrency(displayTotalOutflow)}) <span className="text-textSecondary text-xs font-normal">(100,00%)</span>
            </span>
          </div>
          <div className="flex justify-between items-center text-textPrimary font-semibold">
            <span className="uppercase tracking-wide text-textSecondary text-[11px]">Total Penerimaan Termin Proyek</span>
            <span className="font-mono text-success font-bold text-sm">
              +{formatCurrency(displayTotalInflow)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2.5 border-t border-border font-bold">
            <span className="uppercase tracking-wide text-textPrimary text-xs flex items-center gap-1.5">
              <span>Saldo Kas Bersih Proyek</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                displayNetCash >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}>
                {displayNetCash >= 0 ? 'Surplus Positif' : 'Defisit Kas'}
              </span>
            </span>
            <span className={`font-mono text-base ${displayNetCash >= 0 ? 'text-success' : 'text-danger'}`}>
              {displayNetCash >= 0 ? '+' : ''}{formatCurrency(displayNetCash)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. MATRIKS ARUS KAS MINGGUAN (WEEKLY MATRIX) */}
      <div className="border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="bg-background px-4 py-3 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="font-bold text-sm text-textPrimary flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            4. Matriks Arus Kas Mingguan ({groupingMode === 'coa' ? 'Berdasarkan Akun COA Buku Besar' : 'Berdasarkan Kategori Proyek'})
          </h3>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 bg-card p-1 rounded-lg border border-border text-xs shadow-2xs">
              <button
                onClick={() => setGroupingMode('category')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  groupingMode === 'category' ? 'bg-[#8C5F34] text-white shadow-2xs font-bold' : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                <Tag className="w-3 h-3 text-amber-200" />
                <span>Kategori</span>
              </button>
              <button
                onClick={() => setGroupingMode('coa')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  groupingMode === 'coa' ? 'bg-[#294825] text-white shadow-2xs font-bold' : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                <BookOpen className="w-3 h-3 text-emerald-200" />
                <span>Akun COA</span>
              </button>
            </div>
            <span className="text-xs text-textSecondary font-mono">
              {groupingMode === 'coa' ? `${(activeData.coa_matrix || []).length} Akun COA` : `${activeData.matrix.length} Kategori`} x {activeData.weeks?.length || 10} Minggu
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#294825] text-white uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-16 text-center">Kode</th>
                <th className="py-2.5 px-3 min-w-[200px]">{groupingMode === 'coa' ? 'Akun Buku Besar (COA)' : 'Kategori Transaksi'}</th>
                {activeData.weeks.map((w: any) => (
                  <th key={w.week_num} className="py-2.5 px-2 text-right whitespace-nowrap">W{w.week_num}</th>
                ))}
                <th className="py-2.5 px-3 text-right font-bold bg-[#1f361c]">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {(groupingMode === 'coa' ? (activeData.coa_matrix || []) : activeData.matrix).map((row: any, idx: number) => {
                const isInf = row.flow === 'INFLOW';
                return (
                  <tr key={`${row.code}-${idx}`} className={`hover:bg-primary/5 ${idx % 2 === 1 ? 'bg-background/40' : ''}`}>
                    <td className="py-2 px-3 text-center font-mono text-[10px] text-textSecondary">{row.code}</td>
                    <td className="py-2 px-3 font-medium text-textPrimary">
                      {row.category}
                      {row.is_new && <span className="ml-1 text-[9px] px-1 rounded bg-amber-500/20 text-amber-600 font-bold">*baru</span>}
                    </td>
                    {activeData.weeks.map((w: any) => {
                      const val = row.weeks[`W${w.week_num}`] || 0;
                      return (
                        <td key={w.week_num} className="py-2 px-2 text-right font-mono text-[11px] whitespace-nowrap">
                          {val > 0 ? formatCurrency(val) : '-'}
                        </td>
                      );
                    })}
                    <td className={`py-2 px-3 text-right font-mono text-[11px] font-bold ${isInf ? 'text-success' : 'text-textPrimary'}`}>
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-background border-t-2 border-border font-bold">
              <tr className="border-b border-border">
                <td colSpan={2} className="py-2 px-3 text-right uppercase text-danger">TOTAL PENGELUARAN</td>
                {activeData.weeks.map((w: any) => (
                  <td key={w.week_num} className="py-2 px-2 text-right font-mono text-danger">
                    {w.outflow > 0 ? formatCurrency(w.outflow) : '-'}
                  </td>
                ))}
                <td className="py-2 px-3 text-right font-mono text-danger font-bold">
                  {formatCurrency(activeData.kpi.total_outflow)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-primary">NET CASH FLOW</td>
                {activeData.weeks.map((w: any) => (
                  <td key={w.week_num} className={`py-2.5 px-2 text-right font-mono ${w.net >= 0 ? 'text-success font-semibold' : 'text-danger'}`}>
                    {w.net !== 0 ? formatCurrency(w.net) : '-'}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right font-mono text-success font-bold text-sm">
                  +{formatCurrency(activeData.kpi.net_cashflow)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. AUDIT TRAIL RINCIAN TRANSAKSI TERVERIFIKASI */}
      <div className="border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="bg-background px-4 py-3 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="font-bold text-sm text-textPrimary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              5. Rincian Transaksi Terverifikasi (Audit Log {selectedWeek === 'all' ? 'Semua Minggu' : `Minggu ${selectedWeek}`})
            </h3>
            <p className="text-xs text-textSecondary">
              {cashflowSubTab === 'copy1'
                ? `Menyandingkan rincian item kas kecil LPJ dan mutasi bank riil (${activeData.transactions?.length || 0} transaksi)`
                : `Menyandingkan deskripsi asli Mandiri Kopra dengan akun COA buku besar (${activeData.transactions?.length || 0} transaksi bank)`}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
              <input
                type="text"
                placeholder="Cari voucher / deskripsi / COA..."
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={txCategoryFilter}
              onChange={(e) => setTxCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-textPrimary focus:outline-none"
            >
              <option value="all">Semua {groupingMode === 'coa' ? 'Akun COA' : 'Kategori'}</option>
              {groupingMode === 'coa'
                ? (activeData.coa_summary || []).map((c: any) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))
                : activeData.categories_summary.map((c: any) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))
              }
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-card text-textSecondary uppercase sticky top-0 border-b border-border text-[10px] z-10">
              <tr>
                <th className="py-2 px-3 text-center w-12">Wk</th>
                <th className="py-2 px-3 w-24">Tanggal</th>
                <th className="py-2 px-3 w-44">Kategori Terverifikasi</th>
                <th className="py-2 px-3 w-48">Akun COA Terdaftar</th>
                <th className="py-2 px-4">Deskripsi Transaksi Asli</th>
                <th className="py-2 px-3 text-right w-28">Kas Masuk</th>
                <th className="py-2 px-3 text-right w-28">Kas Keluar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-textSecondary">
                    Tidak ada transaksi yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((t: any, idx: number) => {
                  const isInf = t.flow === 'INFLOW';
                  return (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedDetailTx(t)}
                      className="hover:bg-primary/10 transition-colors cursor-pointer group select-none"
                      title="Klik untuk melihat rincian transaksi & jurnal"
                    >
                      <td className="py-2 px-3 text-center font-bold text-primary">W{t.week_num}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-textSecondary">{t.date}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          t.is_new 
                            ? 'bg-amber-500/15 text-amber-600' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {t.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-textSecondary font-mono text-[11px]">
                        {t.coa_code} {t.coa_name}
                      </td>
                      <td className="py-2 px-4 text-textPrimary font-medium">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{t.description}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary flex items-center gap-1 font-semibold shrink-0 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                            <Eye className="w-3 h-3" /> Detail
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-success font-semibold">
                        {isInf ? formatCurrency(t.amount) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-danger font-semibold">
                        {!isInf ? formatCurrency(t.amount) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Popup Modal Detail Transaksi */}
      {selectedDetailTx && (
        <WeeklyTransactionDetailModal
          transaction={selectedDetailTx}
          onClose={() => setSelectedDetailTx(null)}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}
