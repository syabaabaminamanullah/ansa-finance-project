import { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Briefcase, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Download, Eye, Paperclip, Upload, X, FileText, BookOpen, Save, Loader2, ShieldCheck, CheckCircle2, Coins, Receipt, Activity, Wallet, Building2, Sparkles, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, financialsApi, projectsApi, stakeholdersApi, rabApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { DataTable } from '../../../components/ui/DataTable';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WeeklyProjectCashflowView } from '../components/WeeklyProjectCashflowView';

const API_BASE = 'http://localhost:8000/api/v1/finance';

interface Project {
  id: string;
  name: string;
  contract_value: string;
  contract_value_usd: number;
  contract_value_idr: number;
  customer_id?: string;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  address: string;
  contact: string;
}

interface Expense {
  id: string;
  expense_number: string;
  date: string;
  project_id?: string;
  description: string;
  amount: number;
  status: string;
}

interface ApInvoice {
  id: string;
  invoice_number: string;
  project_id?: string;
  date: string;
  description: string;
  total_amount: number;
  status: string;
}

interface ArInvoice {
  id: string;
  invoice_number: string;
  project_id?: string;
  date: string;
  description: string;
  total_amount: number;
  status: string;
}

interface Transaction {
  id: string;
  date: string;
  number: string;
  type: string;
  description: string;
  amount: number;
  status: string;
}

// Premium executive color palette for charts
const COLORS = ['#D4AF37', '#3B82F6', '#10B981', '#F43F5E', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899', '#6366F1', '#14B8A6'];

const findJournalForTransaction = (tx: Transaction | null, journalsList: any[]) => {
  if (!tx) return null;
  // 1. Direct match by ID
  let found = journalsList.find(j => j.id === tx.id);
  if (found) return found;

  // 2. Match by journal_number matching tx.number
  found = journalsList.find(j => j.journal_number === tx.number || j.number === tx.number);
  if (found) return found;

  // 3. Match by ref_id
  found = journalsList.find(j => j.ref_id === tx.id);
  if (found) return found;

  // 4. Match by description containing tx.number
  if (tx.number && tx.number !== '-') {
    found = journalsList.find(j => (j.description || '').includes(tx.number));
    if (found) return found;
  }

  // 5. Match by description & date
  found = journalsList.find(j => j.date === tx.date && (j.description || '').toLowerCase() === tx.description.toLowerCase());
  return found || null;
};

function JournalDetailModal({
  transaction,
  journal,
  coas,
  onClose,
  onUpdated
}: {
  transaction: Transaction;
  journal: any | null;
  coas: any[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [memo, setMemo] = useState(journal?.attachment_memo || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const journalId = journal?.id;

  const loadPreview = async () => {
    if (!journalId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/journals/${journalId}/attachment`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewType(blob.type.includes('pdf') ? 'pdf' : 'image');
    } catch {}
  };

  useEffect(() => {
    if (journal?.attachment_path) {
      loadPreview();
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [journal]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !journalId) return;

    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/journals/${journalId}/attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Upload failed');
      }

      addToast('success', 'Upload Berhasil', 'Bukti transfer berhasil diupload.');
      onUpdated();

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewType(file.type.includes('pdf') ? 'pdf' : 'image');
    } catch (err: any) {
      addToast('error', 'Upload Gagal', err.message || 'Gagal mengupload file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveMemo = async () => {
    if (!journalId) return;
    setIsSavingMemo(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/journals/${journalId}/memo`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo })
      });
      if (!res.ok) throw new Error('Save failed');
      addToast('success', 'Memo Tersimpan', 'Catatan berhasil disimpan.');
      onUpdated();
    } catch {
      addToast('error', 'Gagal', 'Gagal menyimpan memo.');
    } finally {
      setIsSavingMemo(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (val === 0) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const totalDebit = journal?.lines?.reduce((sum: number, l: any) => sum + (l.debit || 0), 0) || 0;
  const totalCredit = journal?.lines?.reduce((sum: number, l: any) => sum + (l.credit || 0), 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-textPrimary text-lg">{transaction.number}</h2>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                  {transaction.type}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  ['Paid', 'Posted'].includes(transaction.status) ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                }`}>
                  {transaction.status}
                </span>
              </div>
              <p className="text-xs text-textSecondary font-mono mt-0.5">Tanggal: {transaction.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background text-textSecondary hover:text-textPrimary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Description & Memo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-background/50 border border-border rounded-xl p-4 space-y-1">
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Keterangan Transaksi:</p>
              <p className="text-sm font-medium text-textPrimary">{transaction.description}</p>
              <p className="text-xs text-textSecondary mt-2">Nominal Total: <span className="font-bold text-primary">{formatCurrency(transaction.amount)}</span></p>
            </div>

            <div className="bg-background/50 border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Memo Tambahan / Catatan Transfer:</p>
              <div className="flex gap-2.5 items-stretch">
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan (misal: Bukti TF gabungan beberapa proyek)..."
                  className="flex-1 px-3 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-textPrimary resize-none placeholder:text-textSecondary/40 transition-all shadow-xs"
                />
                {journalId && (
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
                )}
              </div>
            </div>
          </div>

          {/* Full Journal Entry Table */}
          <div>
            <h3 className="font-bold text-textPrimary mb-2 flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-primary" /> Rincian Ayat Jurnal (Full Journal Entry Lines)
            </h3>
            {journal?.lines && journal.lines.length > 0 ? (
              <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-background text-textSecondary font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Kode Akun</th>
                      <th className="px-4 py-2.5">Nama Akun</th>
                      <th className="px-4 py-2.5">Keterangan Baris</th>
                      <th className="px-4 py-2.5 text-right">Debit (IDR)</th>
                      <th className="px-4 py-2.5 text-right">Kredit (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {journal.lines.map((line: any, idx: number) => {
                      const coa = coas.find(c => c.id === line.account_id);
                      return (
                        <tr key={line.id || idx} className="hover:bg-background/40">
                          <td className="px-4 py-2 font-mono font-medium text-primary">{coa?.account_code || 'Unknown'}</td>
                          <td className="px-4 py-2 font-medium text-textPrimary">{coa?.account_name || 'Unknown'}</td>
                          <td className="px-4 py-2 text-textSecondary">{line.description || '-'}</td>
                          <td className="px-4 py-2 text-right font-mono">{line.debit ? formatCurrency(line.debit) : '-'}</td>
                          <td className="px-4 py-2 text-right font-mono text-textSecondary">{line.credit ? formatCurrency(line.credit) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-background/80 font-bold border-t border-border">
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-right text-textSecondary">Total Balance Jurnal:</td>
                      <td className="px-4 py-2.5 text-right font-mono text-primary">{formatCurrency(totalDebit)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-primary">{formatCurrency(totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-textSecondary">
                Rincian jurnal umum tidak ditemukan untuk transaksi ini.
              </div>
            )}
          </div>

          {/* Bukti Transfer / Attachment Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-textPrimary text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary" /> Lampiran / Bukti Transfer
              </h3>
              {previewUrl && (
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors font-medium"
                >
                  <Eye className="w-3.5 h-3.5" /> Lihat Ukuran Penuh
                </button>
              )}
            </div>

            {previewUrl ? (
              <div className="border border-border rounded-xl p-3 bg-background/50 space-y-3">
                {previewType === 'image' ? (
                  <img
                    src={previewUrl}
                    alt="Bukti Transfer"
                    className="w-full max-h-[45vh] object-contain rounded-lg border border-border bg-background"
                  />
                ) : (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[45vh] rounded-lg border border-border"
                    title="Bukti Transfer PDF"
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-border rounded-xl text-textSecondary">
                <Paperclip className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs font-medium text-textPrimary">Belum ada bukti transfer diupload</p>
                <p className="text-xs mt-0.5">Format file: PDF, JPG, atau PNG</p>
              </div>
            )}

            {/* Upload Button inside Modal */}
            {journalId && (
              <div className="mt-3">
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
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground rounded-xl text-xs font-medium transition-colors shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading
                    ? 'Mengupload...'
                    : previewUrl
                    ? 'Ganti / Upload Ulang Bukti Transfer'
                    : 'Upload Bukti Transfer (PDF/JPG/PNG)'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-background hover:bg-border text-textPrimary rounded-xl text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectFinancialReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeReportMode, setActiveReportMode] = useState<'overview' | 'weekly_project' | 'copy1'>('overview');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isProjectPdfDropdownOpen, setIsProjectPdfDropdownOpen] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  useEffect(() => {
    if (selectedProjectId && selectedProject) {
      if (!selectedProject.code.includes('IKPT') && activeReportMode === 'copy1') {
        setActiveReportMode('weekly_project');
      }
    }
  }, [selectedProjectId, selectedProject, activeReportMode]);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [apInvoices, setApInvoices] = useState<ApInvoice[]>([]);
  const [arInvoices, setArInvoices] = useState<ArInvoice[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [coas, setCoas] = useState<any[]>([]);
  
  const [_isLoading, setIsLoading] = useState(true);
  const [rabItems, setRabItems] = useState<any[]>([]);
  const addToast = useToastStore((state) => state.addToast);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [projRes, expRes, apRes, arRes, custRes, jourRes, coasRes] = await Promise.all([
        projectsApi.getProjects(),
        financeApi.getExpenses(),
        financeApi.getApInvoices(),
        financeApi.getArInvoices(),
        stakeholdersApi.getCustomers(),
        financeApi.getJournals(),
        financialsApi.getCoas()
      ]);
      setProjects(projRes.data);
      setExpenses(expRes.data);
      setApInvoices(apRes.data);
      setArInvoices(arRes.data);
      setCustomers(custRes.data);
      setJournals(jourRes.data);
      setCoas(coasRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch financial data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [addToast]);

  // Fetch RAB items when project changes
  useEffect(() => {
    if (!selectedProjectId) { setRabItems([]); return; }
    rabApi.getByProject(selectedProjectId).then(r => setRabItems(r.data)).catch(() => setRabItems([]));
  }, [selectedProjectId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const formatCurrencyUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const projectData = useMemo(() => {
    if (!selectedProjectId) return null;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return null;

    const customer = customers.find(c => c.id === project.customer_id);

    const projExpenses = expenses.filter(e => e.project_id === selectedProjectId);
    const projAp = apInvoices.filter(i => i.project_id === selectedProjectId);
    const projAr = arInvoices.filter(i => i.project_id === selectedProjectId);
    
    // Create a set of expense account IDs (starts with 5 - COGS) to match P&L exactly
    const expenseAccountIds = new Set(coas.filter(c => 
      c.account_code.startsWith('5') || c.account_code.startsWith('6') || c.account_code.startsWith('7')
    ).map(c => c.id));
    
    // Income accounts for reference (starts with 4)
    const incomeAccountIds = new Set(coas.filter(c => 
      c.account_code.startsWith('4')
    ).map(c => c.id));

    // ==========================================
    // AKURASI DATA P&L (Berdasarkan Jurnal)
    // ==========================================
    let totalActualCost = 0;
    let totalBilled = 0;

    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      const pLines = j.lines?.filter((l: any) => l.project_id === selectedProjectId) || [];
      if (pLines.length === 0) return;

      pLines.forEach((l: any) => {
        if (incomeAccountIds.has(l.account_id)) {
          totalBilled += (l.credit - l.debit);
        }
        if (expenseAccountIds.has(l.account_id)) {
          totalActualCost += (l.debit - l.credit);
        }
      });
    });
    
    const budgetIDR = project.contract_value_idr || 0;
    const budgetUSD = project.contract_value_usd || 0;
    const remainingBudget = budgetIDR - totalActualCost;

    const projJournals = journals
      .filter(j => 
        j.status === 'Posted' && 
        j.lines?.some((l: any) => l.project_id === selectedProjectId) &&
        !(j.description || '').startsWith('Auto-journal for ')
      )
      .map(j => {
        const pLines = j.lines.filter((l: any) => l.project_id === selectedProjectId);
        const amount = pLines.reduce((sum: number, l: any) => sum + (expenseAccountIds.has(l.account_id) ? l.debit : 0), 0);
        return {
          id: j.id,
          date: j.date,
          number: j.journal_number || j.number || '-',
          description: j.description || '-',
          amount: amount,
          status: j.status
        };
      })
      .filter(j => j.amount > 0);

    // Combine transactions for the table
    const transactions: Transaction[] = [
      ...projExpenses.map(e => ({
        id: e.id,
        date: e.date,
        number: e.expense_number,
        type: 'Direct Expense',
        description: e.description,
        amount: e.amount,
        status: e.status
      })),
      ...projAp.map(i => ({
        id: i.id,
        date: i.date,
        number: i.invoice_number,
        type: 'AP Invoice (Vendor)',
        description: i.description || '-',
        amount: i.total_amount,
        status: i.status
      })),
      ...projAr.map(i => ({
        id: i.id,
        date: i.date,
        number: i.invoice_number,
        type: 'AR Invoice (Income)',
        description: i.description || '-',
        amount: i.total_amount,
        status: i.status
      })),
      ...projJournals.map(j => ({
        id: j.id,
        date: j.date,
        number: j.number,
        type: 'Manual Journal (Expense)',
        description: j.description,
        amount: j.amount,
        status: j.status
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Compute real cost breakdown by COA account/category
    const breakdownMap: Record<string, number> = {};

    projExpenses.forEach(e => {
      const coa = coas.find(c => c.id === e.expense_account_id);
      const catName = coa ? coa.account_name : 'Direct Expense';
      breakdownMap[catName] = (breakdownMap[catName] || 0) + (e.amount || 0);
    });

    projAp.forEach(a => {
      const coa = coas.find(c => c.id === (a as any).expense_account_id);
      const catName = coa ? coa.account_name : 'Vendor Bill (AP)';
      breakdownMap[catName] = (breakdownMap[catName] || 0) + (a.total_amount || 0);
    });

    projJournals.forEach(j => {
      const catName = 'Manual Journal (Beban)';
      breakdownMap[catName] = (breakdownMap[catName] || 0) + (j.amount || 0);
    });

    let costBreakdown = Object.entries(breakdownMap)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    if (costBreakdown.length === 0 && totalActualCost > 0) {
      costBreakdown = [{ name: 'Biaya Pokok Proyek (COGS)', value: totalActualCost }];
    }

    return {
      project,
      customer,
      budgetIDR,
      budgetUSD,
      totalActualCost,
      remainingBudget,
      totalBilled,
      transactions,
      costBreakdown,
      budgetStatus: [
        { name: 'Terpakai (Spent)', value: totalActualCost },
        { name: 'Sisa Anggaran', value: Math.max(0, remainingBudget) }
      ]
    };
  }, [selectedProjectId, projects, expenses, apInvoices, arInvoices, journals, coas]);

  // Compute COA Recap for selected project
  const projectCoaRecap = useMemo(() => {
    if (!selectedProjectId) return [];
    const recap: Record<string, { code: string, name: string, debit: number, credit: number }> = {};
    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      j.lines?.forEach((l: any) => {
        if (l.project_id === selectedProjectId) {
          const coa = coas.find(c => c.id === l.account_id);
          if (coa) {
            if (!recap[coa.id]) {
              recap[coa.id] = { code: coa.account_code, name: coa.account_name, debit: 0, credit: 0 };
            }
            recap[coa.id].debit += (l.debit || 0);
            recap[coa.id].credit += (l.credit || 0);
          }
        }
      });
    });
    return Object.values(recap).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [selectedProjectId, journals, coas]);

  // Compute Consolidated COA Recap (All Projects)
  const consolidatedCoaRecap = useMemo(() => {
    const recap: Record<string, { code: string, name: string, debit: number, credit: number }> = {};
    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      const hasProject = j.lines?.some((l: any) => !!l.project_id);
      if (!hasProject) return;

      j.lines?.forEach((l: any) => {
        if (l.project_id) {
          const coa = coas.find(c => c.id === l.account_id);
          if (coa) {
            if (!recap[coa.id]) {
              recap[coa.id] = { code: coa.account_code, name: coa.account_name, debit: 0, credit: 0 };
            }
            recap[coa.id].debit += (l.debit || 0);
            recap[coa.id].credit += (l.credit || 0);
          }
        }
      });
    });
    return Object.values(recap).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [journals, coas]);

  const transactionColumns = [
    { header: 'Date', accessor: 'date' as keyof Transaction, className: 'w-24 whitespace-nowrap' },
    { header: 'Transaction No.', accessor: 'number' as keyof Transaction, className: 'font-mono text-primary font-medium w-32' },
    { header: 'Type', accessor: (row: Transaction) => (
      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
        row.type === 'Direct Expense' ? 'bg-orange-500/10 text-orange-600' : 
        row.type === 'AR Invoice (Income)' ? 'bg-success/10 text-success' :
        row.type === 'Manual Journal (Expense)' ? 'bg-blue-500/10 text-blue-600' :
        'bg-purple-500/10 text-purple-600'
      }`}>
        {row.type}
      </span>
    )},
    { header: 'Description', accessor: 'description' as keyof Transaction },
    { header: 'Amount', accessor: (row: Transaction) => formatCurrency(row.amount), className: 'text-right font-medium' },
    { header: 'Status', accessor: (row: Transaction) => (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        ['Paid', 'Posted'].includes(row.status) ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
      }`}>
        {row.status}
      </span>
    ), className: 'w-24' },
    { 
      header: 'Detail / Bukti', 
      accessor: (row: Transaction) => {
        const j = findJournalForTransaction(row, journals);
        const hasAttachment = j?.attachment_path;
        return (
          <button
            onClick={() => setSelectedTransaction(row)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all shadow-sm ${
              hasAttachment
                ? 'bg-success/15 text-success border border-success/30 hover:bg-success/25'
                : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
            }`}
            title="Lihat Rincian Jurnal & Bukti Transfer"
          >
            {hasAttachment ? <Paperclip className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{hasAttachment ? 'Bukti & Jurnal' : 'Detail'}</span>
          </button>
        );
      },
      className: 'w-32 text-center'
    }
  ];


  const handleDownloadSingleProjectPDF = () => {
    if (!selectedProjectId || !projectData) {
      addToast('error', 'Select Project', 'Please select a project first to download its report.');
      return;
    }

    const { project, customer, budgetIDR, budgetUSD, totalActualCost, remainingBudget, totalBilled } = projectData;

    const incomeAccountIds = new Set(coas.filter(c => c.account_code.startsWith('4')).map(c => c.id));
    const expenseAccountIds = new Set(coas.filter(c => c.account_code.startsWith('5') || c.account_code.startsWith('6') || c.account_code.startsWith('7')).map(c => c.id));

    // Filter project details
    let pTotalIn = 0;
    let pTotalEx = 0;
    const details: any[] = [];

    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      const pLines = j.lines?.filter((l: any) => l.project_id === project.id) || [];
      if (pLines.length === 0) return;

      let jIncome = 0;
      let jExpense = 0;

      pLines.forEach((l: any) => {
        if (incomeAccountIds.has(l.account_id)) {
          jIncome += (l.credit - l.debit);
        }
        if (expenseAccountIds.has(l.account_id)) {
          jExpense += (l.debit - l.credit);
        }
      });

      const hasAttachment = !!(j.attachment_path || (j as any).proof_url || (j as any).file_url);
      const statusBukti = hasAttachment ? 'Sudah Upload' : 'Belum Upload';

      if (jIncome !== 0) {
        pTotalIn += jIncome;
        details.push({
          date: j.date,
          ref: j.journal_number,
          description: `Income: ${j.description}`,
          income: jIncome,
          expense: 0,
          statusBukti
        });
      }
      if (jExpense !== 0) {
        pTotalEx += jExpense;
        details.push({
          date: j.date,
          ref: j.journal_number,
          description: `Expense (COGS): ${j.description}`,
          income: 0,
          expense: jExpense,
          statusBukti
        });
      }
    });

    details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Comprehensive Journals for this project
    const projJournalsList: any[] = [];
    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      const pLines = j.lines?.filter((l: any) => l.project_id === project.id) || [];
      if (pLines.length === 0) return;

      const hasAttachment = !!(j.attachment_path || (j as any).proof_url || (j as any).file_url);
      const statusBukti = hasAttachment ? 'Sudah Upload' : 'Belum Upload';

      pLines.forEach((l: any) => {
        const coa = coas.find(c => c.id === l.account_id);
        projJournalsList.push({
          date: j.date,
          journal_id: j.id,
          account: coa ? `${coa.account_code} ${coa.account_name}` : 'Unknown',
          description: l.description || j.description || '-',
          ref: j.journal_number,
          debit: l.debit,
          credit: l.credit,
          statusBukti
        });
      });
    });

    // Urutkan kronologis tanggal dan nomor jurnal
    projJournalsList.sort((a, b) => {
      const cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (cmp !== 0) return cmp;
      return (a.ref || '').localeCompare(b.ref || '');
    });

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const printDate = new Date().toLocaleString('id-ID');

    // Page 1 Header Box
    doc.setFillColor(20, 60, 100);
    doc.rect(14, 12, pageWidth - 28, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('LAPORAN KEUANGAN PROYEK', 18, 20.5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tgl Cetak: ${printDate}`, pageWidth - 18, 20.5, { align: 'right' });

    // Project Info Summary Header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 60, 100);
    doc.text(`Proyek: ${project.name.toUpperCase()} (${project.code})`, 14, 33);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.text(`Client / Klien: ${customer?.name || '-'} | Status: ${project.status}`, 14, 38);

    // Executive Metrics Cards Table Box
    const profitMargin = totalBilled - totalActualCost;
    const summaryRows = [
      [
        `Nilai Kontrak (Budget):
${formatCurrency(budgetIDR)}`,
        `Biaya Aktual (Spent):
${formatCurrency(totalActualCost)}`,
        `Sisa Anggaran:
${formatCurrency(remainingBudget)}`,
        `Total Tagihan (AR):
${formatCurrency(totalBilled)}`,
        `Laba Proyek (Profit):
${formatCurrency(profitMargin)}`
      ]
    ];

    autoTable(doc, {
      startY: 42,
      body: summaryRows,
      theme: 'plain',
      styles: { fontSize: 8.5, fontStyle: 'bold', halign: 'center', valign: 'middle', cellPadding: 3 },
      columnStyles: {
        0: { fillColor: [240, 245, 250], textColor: [20, 60, 100] },
        1: { fillColor: [254, 242, 242], textColor: [185, 28, 28] },
        2: { fillColor: [240, 253, 244], textColor: [21, 128, 61] },
        3: { fillColor: [239, 246, 255], textColor: [29, 78, 216] },
        4: { fillColor: profitMargin >= 0 ? [240, 253, 244] : [254, 242, 242], textColor: profitMargin >= 0 ? [21, 128, 61] : [185, 28, 28] }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 6;

    // SECTION 1: RINCIAN TRANSAKSI AKTUAL
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 60, 100);
    doc.text('BAGIAN I: RINCIAN TRANSAKSI KEUANGAN PROYEK', 14, currentY);

    const rRows = details.map(d => [
      d.date,
      `- ${d.description}`,
      d.statusBukti,
      d.income > 0 ? formatCurrency(d.income) : '-',
      d.expense > 0 ? formatCurrency(d.expense) : '-'
    ]);

    rRows.push(['', 'Subtotal', '', formatCurrency(pTotalIn), formatCurrency(pTotalEx)]);
    rRows.push(['', 'SISA SALDO PROYEK (Pemasukan - Pengeluaran)', '', '', formatCurrency(pTotalIn - pTotalEx)]);

    autoTable(doc, {
      head: [['Tanggal', 'Komponen Aktual Tervalidasi', 'Status Bukti', 'Pemasukan (Rp)', 'Pengeluaran (Rp)']],
      body: rRows,
      startY: currentY + 3,
      theme: 'grid',
      margin: { bottom: 20 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [220, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 }
      },
      willDrawCell: (data) => {
        if (data.column.index === 2 && data.section === 'body') {
          if (data.cell.raw === 'Sudah Upload') {
            data.cell.styles.textColor = [0, 140, 0];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Belum Upload') {
            data.cell.styles.textColor = [150, 150, 150];
          }
        }
        if ([3, 4].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp') || text.startsWith('-Rp')) data.cell.text = [''];
        }
        if (data.row.index >= rRows.length - 2) {
          data.cell.styles.fontStyle = 'bold';
          if (data.row.index === rRows.length - 1) {
            data.cell.styles.fillColor = [240, 245, 250];
            if (data.column.index === 4) {
              const val = pTotalIn - pTotalEx;
              if (val < 0) data.cell.styles.textColor = [200, 0, 0];
              else if (val > 0) data.cell.styles.textColor = [0, 150, 0];
            }
          }
        }
      },
      didDrawCell: (data) => {
        if ([3, 4].includes(data.column.index) && data.section === 'body') {
          const text = String(data.cell.raw);
          let rp = '';
          let num = '';
          if (text.startsWith('Rp')) {
            rp = 'Rp';
            num = text.replace(/^Rp\s*/, '');
          } else if (text.startsWith('-Rp')) {
            rp = '-Rp';
            num = text.replace(/^-Rp\s*/, '');
          }
          if (rp && num) {
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    // SECTION 2: JURNAL PROYEK
    currentY = (doc as any).lastAutoTable.finalY + 8;
    if (currentY > 165) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 60, 100);
    doc.text('BAGIAN II: RINCIAN JURNAL AKUNTANSI PROYEK', 14, currentY);

    let jTotalDebit = 0;
    let jTotalCredit = 0;

    const gJournals: any[] = [];
    let curJId = '';
    projJournalsList.forEach(j => {
      if (j.journal_id !== curJId) {
        curJId = j.journal_id;
        gJournals.push(j);
      } else {
        gJournals.push({ ...j, date: '', ref: '', statusBukti: '' });
      }
    });

    const gRows = gJournals.map(j => {
      jTotalDebit += j.debit;
      jTotalCredit += j.credit;
      return [
        j.date,
        `${j.account}\n(${j.description})`,
        j.ref,
        j.statusBukti || '',
        j.debit > 0 ? formatCurrency(j.debit) : '-',
        j.credit > 0 ? formatCurrency(j.credit) : '-'
      ];
    });

    gRows.push(['', 'TOTAL DEBIT & KREDIT PROYEK', '', '', formatCurrency(jTotalDebit), formatCurrency(jTotalCredit)]);

    autoTable(doc, {
      head: [['Tanggal', 'Akun & Keterangan', 'Ref', 'Status Bukti', 'Debit (Rp)', 'Kredit (Rp)']],
      body: gRows,
      startY: currentY + 3,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [240, 245, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 45 },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 35 },
        5: { cellWidth: 35 }
      },
      willDrawCell: (data) => {
        if (data.column.index === 3 && data.section === 'body') {
          if (data.cell.raw === 'Sudah Upload') {
            data.cell.styles.textColor = [0, 140, 0];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Belum Upload') {
            data.cell.styles.textColor = [150, 150, 150];
          }
        }
        if ([4, 5].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) data.cell.text = [''];
        }
        if (data.row.index === gRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [20, 60, 100];
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
      didDrawCell: (data) => {
        if ([4, 5].includes(data.column.index) && data.section === 'body' && data.row.index < gRows.length - 1) {
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) {
            const rp = 'Rp';
            const num = text.replace(/^Rp\s*/, '');
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, 195, { align: 'right' });
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  const handleDownloadConsolidatedPDF = () => {
    if (projects.length === 0) {
      addToast('error', 'No Data', 'No projects available to generate report.');
      return;
    }
    
    // Aggregation logic
    let totalGlobalIncome = 0;
    let totalGlobalExpense = 0;
    let totalNonProjectIncome = 0;
    let totalNonProjectExpense = 0;
    let totalCompanyCash = 0;

    const projectSummaries: any[] = [];
    const coaRecap: Record<string, { code: string, name: string, debit: number, credit: number }> = {};
    const comprehensiveJournals: any[] = [];
    const projectDetails: Record<string, any[]> = {};

    const incomeAccountIds = new Set(coas.filter(c => c.account_code.startsWith('4')).map(c => c.id));
    const expenseAccountIds = new Set(coas.filter(c => c.account_code.startsWith('5') || c.account_code.startsWith('6') || c.account_code.startsWith('7')).map(c => c.id));
    const cashAccountIds = new Set(coas.filter(c => c.account_code.startsWith('111') || c.account_code.startsWith('112')).map(c => c.id));

    // Calculate company-wide cash and non-project expenses/incomes
    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      j.lines?.forEach((l: any) => {
        if (cashAccountIds.has(l.account_id)) {
          totalCompanyCash += (l.debit - l.credit);
        }
        if (!l.project_id) {
          if (incomeAccountIds.has(l.account_id)) {
            totalNonProjectIncome += (l.credit - l.debit);
          }
          if (expenseAccountIds.has(l.account_id)) {
            totalNonProjectExpense += (l.debit - l.credit);
          }
        }
      });
    });

    projects.forEach(project => {
      let totalIncome = 0;
      let totalExpense = 0;
      const details: any[] = [];

      // Gunakan HANYA jurnal yang sudah di-post (sama seperti P&L)
      journals.forEach(j => {
        if (j.status !== 'Posted') return;

        const pLines = j.lines?.filter((l: any) => l.project_id === project.id) || [];
        if (pLines.length === 0) return;
        
        let jIncome = 0;
        let jExpense = 0;
        
        pLines.forEach((l: any) => {
          if (incomeAccountIds.has(l.account_id)) {
            jIncome += (l.credit - l.debit);
          }
          if (expenseAccountIds.has(l.account_id)) {
            jExpense += (l.debit - l.credit);
          }
        });

        const hasAttachment = !!(j.attachment_path || (j as any).proof_url || (j as any).file_url);
        const statusBukti = hasAttachment ? 'Sudah Upload' : 'Belum Upload';

        if (jIncome !== 0) {
          totalIncome += jIncome;
          details.push({
             date: j.date,
             ref: j.journal_number,
             description: `Income: ${j.description}`,
             income: jIncome,
             expense: 0,
             statusBukti
          });
        }
        if (jExpense !== 0) {
          totalExpense += jExpense;
          details.push({
             date: j.date,
             ref: j.journal_number,
             description: `Expense (COGS): ${j.description}`,
             income: 0,
             expense: jExpense,
             statusBukti
          });
        }
      });

      details.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      projectDetails[project.id] = details;

      if (totalIncome !== 0 || totalExpense !== 0) {
        projectSummaries.push({
          name: project.name,
          income: totalIncome,
          expense: totalExpense
        });
        totalGlobalIncome += totalIncome;
        totalGlobalExpense += totalExpense;
      }
    });

    const processedJournalIds = new Set();
    journals.forEach(j => {
      if (j.status !== 'Posted') return;
      const hasProject = j.lines?.some((l: any) => !!l.project_id);
      if (!hasProject) return;

      if (!processedJournalIds.has(j.id)) {
        processedJournalIds.add(j.id);
        
        let shouldIncludeJournal = false;

        j.lines.forEach((l: any) => {
          if (l.project_id) {
            shouldIncludeJournal = true;
            const coa = coas.find(c => c.id === l.account_id);
            if (coa) {
              if (!coaRecap[coa.id]) coaRecap[coa.id] = { code: coa.account_code, name: coa.account_name, debit: 0, credit: 0 };
              coaRecap[coa.id].debit += (l.debit || 0);
              coaRecap[coa.id].credit += (l.credit || 0);
            }
          }
        });

        if (shouldIncludeJournal) {
          const hasAttachment = !!(j.attachment_path || (j as any).proof_url || (j as any).file_url);
          const statusBukti = hasAttachment ? 'Sudah Upload' : 'Belum Upload';

          j.lines.forEach((l: any) => {
            const coa = coas.find(c => c.id === l.account_id);
            const proj = projects.find(p => p.id === l.project_id);
            comprehensiveJournals.push({
              date: j.date,
              journal_id: j.id,
              account: coa ? `${coa.account_code} ${coa.account_name}` : 'Unknown',
              description: l.description || j.description || '-',
              ref: j.journal_number,
              project: proj ? proj.name : '-',
              debit: l.debit,
              credit: l.credit,
              statusBukti
            });
          });
        }
      }
    });

    // Pastikan seluruh jurnal berurutan kronologis
    comprehensiveJournals.sort((a, b) => {
      const cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (cmp !== 0) return cmp;
      return (a.ref || '').localeCompare(b.ref || '');
    });

    const doc = new jsPDF('landscape', 'mm', 'a4'); 
    const printDate = new Date().toLocaleString('id-ID');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Page 1: Header
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Tanggal Laporan: ${printDate}`, pageWidth - 14, 15, { align: 'right' });
    doc.text(`Dicetak oleh: Sistem Keuangan PT Ansa`, pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(20, 60, 100);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN KEUANGAN KONSOLIDASI & JURNAL UMUM', 14, 30);
    
    doc.setDrawColor(20, 60, 100);
    doc.setLineWidth(0.5);
    doc.line(14, 34, pageWidth - 14, 34);

    doc.setFontSize(11);
    doc.setFillColor(240, 245, 250);
    doc.rect(14, 38, pageWidth - 28, 8, 'F');
    doc.text('RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)', 16, 43.5);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('A. Total Keuangan Berdasarkan Proyek', 14, 53);

    const tableARows = projectSummaries.map((p, i) => [
      `${i + 1}. ${p.name}`,
      formatCurrency(p.income),
      formatCurrency(p.expense),
      formatCurrency(p.income - p.expense)
    ]);
    tableARows.push(['TOTAL KESELURUHAN', formatCurrency(totalGlobalIncome), formatCurrency(totalGlobalExpense), formatCurrency(totalGlobalIncome - totalGlobalExpense)]);

    autoTable(doc, {
      head: [['Nama Proyek', 'Total Pemasukan (Rp)', 'Total Pengeluaran (Rp)', 'Gross Profit (Rp)']],
      body: tableARows,
      startY: 56,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [220, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      willDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp') || text.startsWith('-Rp')) data.cell.text = [''];
        }
        if (data.row.index === tableARows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index > 0) data.cell.styles.textColor = [200, 0, 0];
        } else if (data.column.index === 3 && data.section === 'body') {
          const text = String(data.cell.raw);
          if (text.startsWith('-Rp')) data.cell.styles.textColor = [200, 0, 0];
          else if (text !== 'Rp 0') data.cell.styles.textColor = [0, 150, 0];
        }
      },
      didDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index) && data.section === 'body') {
          const text = String(data.cell.raw);
          let rp = '';
          let num = '';
          if (text.startsWith('Rp')) {
            rp = 'Rp';
            num = text.replace(/^Rp\s*/, '');
          } else if (text.startsWith('-Rp')) {
            rp = '-Rp';
            num = text.replace(/^-Rp\s*/, '');
          }
          if (rp && num) {
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // SECTION B: Keuangan Operasional Perusahaan (Non-Proyek)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('B. Total Keuangan Operasional Perusahaan (Non-Proyek)', 14, currentY);

    const tableBRows = [
      ['Operasional Pusat / Overhead', formatCurrency(totalNonProjectIncome), formatCurrency(totalNonProjectExpense), formatCurrency(totalNonProjectIncome - totalNonProjectExpense)]
    ];

    autoTable(doc, {
      head: [['Keterangan', 'Total Pemasukan (Rp)', 'Total Pengeluaran (Rp)', 'Net (Rp)']],
      body: tableBRows,
      startY: currentY + 3,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [220, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      willDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp') || text.startsWith('-Rp')) data.cell.text = [''];
        }
        if (data.column.index === 3 && data.section === 'body') {
          const text = String(data.cell.raw);
          if (text.startsWith('-Rp')) data.cell.styles.textColor = [200, 0, 0];
          else if (text !== 'Rp 0') data.cell.styles.textColor = [0, 150, 0];
        }
      },
      didDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index) && data.section === 'body') {
          const text = String(data.cell.raw);
          let rp = '';
          let num = '';
          if (text.startsWith('Rp')) { rp = 'Rp'; num = text.replace(/^Rp\s*/, ''); }
          else if (text.startsWith('-Rp')) { rp = '-Rp'; num = text.replace(/^-Rp\s*/, ''); }
          if (rp && num) {
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // SECTION C: Posisi Saldo Kas Keseluruhan
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('C. Ringkasan Konsolidasi & Posisi Kas Perusahaan Saat Ini', 14, currentY);
    
    const totalAllIncome = totalGlobalIncome + totalNonProjectIncome;
    const totalAllExpense = totalGlobalExpense + totalNonProjectExpense;
    
    const tableCRows = [
      ['Total Proyek', formatCurrency(totalGlobalIncome), formatCurrency(totalGlobalExpense), formatCurrency(totalGlobalIncome - totalGlobalExpense)],
      ['Total Non-Proyek', formatCurrency(totalNonProjectIncome), formatCurrency(totalNonProjectExpense), formatCurrency(totalNonProjectIncome - totalNonProjectExpense)],
      ['TOTAL KONSOLIDASI (LABA/RUGI BERSIH)', formatCurrency(totalAllIncome), formatCurrency(totalAllExpense), formatCurrency(totalAllIncome - totalAllExpense)],
      ['SALDO KAS & BANK TERKINI (POSISI RIIL)', '', '', formatCurrency(totalCompanyCash)]
    ];

    autoTable(doc, {
      head: [['Ringkasan', 'Total Pemasukan (Rp)', 'Total Pengeluaran (Rp)', 'Net / Saldo (Rp)']],
      body: tableCRows,
      startY: currentY + 3,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [240, 245, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
      willDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp') || text.startsWith('-Rp')) data.cell.text = [''];
        }
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.row.index === 3) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [20, 60, 100];
          data.cell.styles.textColor = [255, 255, 255];
        } else if (data.column.index === 3 && data.section === 'body') {
          const text = String(data.cell.raw);
          if (text.startsWith('-Rp')) data.cell.styles.textColor = [200, 0, 0];
          else if (text !== 'Rp 0') data.cell.styles.textColor = [0, 150, 0];
        }
      },
      didDrawCell: (data) => {
        if ([1, 2, 3].includes(data.column.index) && data.section === 'body') {
          const text = String(data.cell.raw);
          let rp = '';
          let num = '';
          if (text.startsWith('Rp')) { rp = 'Rp'; num = text.replace(/^Rp\s*/, ''); }
          else if (text.startsWith('-Rp')) { rp = '-Rp'; num = text.replace(/^-Rp\s*/, ''); }
          if (rp && num) {
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('D. Rekapitulasi Berdasarkan Kategori Akun (COA)', 14, currentY);

    const coaArray = Object.values(coaRecap).sort((a, b) => a.code.localeCompare(b.code));
    let totalDebit = 0;
    let totalCredit = 0;
    const tableDRows = coaArray.map(c => {
      totalDebit += c.debit;
      totalCredit += c.credit;
      return [
        c.code,
        c.name,
        c.debit > 0 ? formatCurrency(c.debit) : '-',
        c.credit > 0 ? formatCurrency(c.credit) : '-'
      ];
    });
    tableDRows.push(['', 'TOTAL', formatCurrency(totalDebit), formatCurrency(totalCredit)]);

    autoTable(doc, {
      head: [['Kode Akun', 'Nama Akun', 'Total Debit (Rp)', 'Total Kredit (Rp)']],
      body: tableDRows,
      startY: currentY + 3,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [220, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      willDrawCell: (data) => {
        if ([2, 3].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) data.cell.text = [''];
        }
        if (data.row.index === tableDRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index > 1) data.cell.styles.textColor = [200, 0, 0];
        }
      },
      didDrawCell: (data) => {
        if ([2, 3].includes(data.column.index) && data.section === 'body') {
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) {
            const rp = 'Rp';
            const num = text.replace(/^Rp\s*/, '');
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    // PAGE 2: BAGIAN I (Rincian per Proyek)
    let projIndex = 1;
    for (const [projId, details] of Object.entries(projectDetails)) {
      if (details.length === 0) continue;
      const p = projects.find(x => x.id === projId);
      
      doc.addPage();
      
      const drawProjectHeader = (data: any) => {
        if (data.pageNumber === 1) {
          doc.setFontSize(11);
          doc.setFillColor(240, 245, 250);
          doc.rect(14, 14, pageWidth - 28, 8, 'F');
          doc.setTextColor(20, 60, 100);
          doc.setFont('helvetica', 'bold');
          doc.text('BAGIAN I: RINCIAN KEUANGAN PER PROYEK', 16, 19.5);
        }
        
        const isContinued = data.pageNumber > 1 ? ' (Lanjutan)' : '';
        const headerY = data.pageNumber === 1 ? 28 : 15;
        
        doc.setFontSize(10);
        doc.setTextColor(20, 60, 100);
        doc.setFont('helvetica', 'bold');
        doc.text(`${projIndex}. Proyek: ${p?.name?.toUpperCase()}${isContinued}`, 14, headerY);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nilai Proyek (Kontrak): ${formatCurrency(p?.contract_value_idr || 0)}`, 14, headerY + 5);
      };
      
      let pTotalIn = 0;
      let pTotalEx = 0;
      
      const rRows = details.map(d => {
        pTotalIn += d.income;
        pTotalEx += d.expense;
        return [
          d.date,
          `- ${d.description}`,
          d.statusBukti,
          d.income > 0 ? formatCurrency(d.income) : '-',
          d.expense > 0 ? formatCurrency(d.expense) : '-'
        ];
      });
      
      rRows.push(['', 'Subtotal', '', formatCurrency(pTotalIn), formatCurrency(pTotalEx)]);
      rRows.push(['', 'SISA SALDO (Pemasukan - Pengeluaran)', '', '', formatCurrency(pTotalIn - pTotalEx)]);
      
      autoTable(doc, {
        head: [['Tanggal', 'Komponen Aktual Tervalidasi', 'Status Bukti', 'Pemasukan (Rp)', 'Pengeluaran (Rp)']],
        body: rRows,
        startY: 38,
        theme: 'grid',
        margin: { top: 25, bottom: 25 },
        styles: { fontSize: 8, valign: 'middle' },
        headStyles: { fillColor: [220, 230, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 24, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 }
        },
        didDrawPage: drawProjectHeader,
        willDrawCell: (data) => {
          if (data.column.index === 2 && data.section === 'body') {
            if (data.cell.raw === 'Sudah Upload') {
              data.cell.styles.textColor = [0, 140, 0];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'Belum Upload') {
              data.cell.styles.textColor = [150, 150, 150];
            }
          }
          if ([3, 4].includes(data.column.index)) {
            data.cell.styles.halign = 'right';
            const text = String(data.cell.raw);
            if (text.startsWith('Rp') || text.startsWith('-Rp')) data.cell.text = [''];
          }
          if (data.row.index >= rRows.length - 2) {
            data.cell.styles.fontStyle = 'bold';
            if (data.row.index === rRows.length - 1) {
              data.cell.styles.fillColor = [240, 245, 250];
              if (data.column.index === 4) {
                const val = pTotalIn - pTotalEx;
                if (val < 0) data.cell.styles.textColor = [200, 0, 0];
                else if (val > 0) data.cell.styles.textColor = [0, 150, 0];
              }
            }
          }
        },
        didDrawCell: (data) => {
          if ([3, 4].includes(data.column.index) && data.section === 'body') {
            const text = String(data.cell.raw);
            let rp = '';
            let num = '';
            if (text.startsWith('Rp')) {
              rp = 'Rp';
              num = text.replace(/^Rp\s*/, '');
            } else if (text.startsWith('-Rp')) {
              rp = '-Rp';
              num = text.replace(/^-Rp\s*/, '');
            }
            
            if (rp && num) {
              const y = data.cell.y + (data.cell.height / 2);
              doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
              doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
            }
          }
        }
      });
      
      projIndex++;
    }

    // PAGE 3: BAGIAN II (Jurnal Komprehensif)
    doc.addPage();
    doc.setFontSize(11);
    doc.setFillColor(240, 245, 250);
    doc.rect(14, 14, pageWidth - 28, 8, 'F');
    doc.setTextColor(20, 60, 100);
    doc.setFont('helvetica', 'bold');
    doc.text('BAGIAN II: JURNAL UMUM KOMPREHENSIF', 16, 19.5);
    
    const groupedJournals: any[] = [];
    let currentJournalId = '';
    comprehensiveJournals.forEach(j => {
      if (j.journal_id !== currentJournalId) {
        currentJournalId = j.journal_id;
        groupedJournals.push(j);
      } else {
        groupedJournals.push({ ...j, date: '', ref: '', statusBukti: '' });
      }
    });

    let gTotalDebit = 0;
    let gTotalCredit = 0;

    const gRows = groupedJournals.map(j => {
      gTotalDebit += j.debit;
      gTotalCredit += j.credit;
      
      const accText = `${j.account}\n(${j.description})`;
      
      return [
        j.date,
        accText,
        j.ref,
        j.project,
        j.statusBukti || '',
        j.debit > 0 ? formatCurrency(j.debit) : '-',
        j.credit > 0 ? formatCurrency(j.credit) : '-'
      ];
    });
    
    gRows.push(['', 'TOTAL KESELURUHAN DEBIT & KREDIT', '', '', '', formatCurrency(gTotalDebit), formatCurrency(gTotalCredit)]);

    autoTable(doc, {
      head: [['Tanggal', 'Akun & Keterangan', 'Ref', 'Tag Proyek', 'Status Bukti', 'Debit (Rp)', 'Kredit (Rp)']],
      body: gRows,
      startY: 28,
      theme: 'grid',
      margin: { bottom: 25 },
      styles: { fontSize: 8, valign: 'middle' },
      headStyles: { fillColor: [240, 245, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 42 },
        3: { cellWidth: 45 },
        4: { cellWidth: 26, halign: 'center' },
        5: { cellWidth: 32 },
        6: { cellWidth: 32 }
      },
      willDrawCell: (data) => {
        if (data.column.index === 4 && data.section === 'body') {
          if (data.cell.raw === 'Sudah Upload') {
            data.cell.styles.textColor = [0, 140, 0];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Belum Upload') {
            data.cell.styles.textColor = [150, 150, 150];
          }
        }
        if ([5, 6].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) data.cell.text = [''];
        }
        if (data.row.index === gRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [20, 60, 100];
          data.cell.styles.textColor = [255, 255, 255];
        }
      },
      didDrawCell: (data) => {
        if ([5, 6].includes(data.column.index) && data.section === 'body' && data.row.index < gRows.length - 1) {
          const text = String(data.cell.raw);
          if (text.startsWith('Rp')) {
            const rp = 'Rp';
            const num = text.replace(/^Rp\s*/, '');
            const y = data.cell.y + (data.cell.height / 2);
            doc.text(rp, data.cell.x + 2, y, { baseline: 'middle' });
            doc.text(num, data.cell.x + data.cell.width - 2, y, { align: 'right', baseline: 'middle' });
          }
        }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, 195, { align: 'right' });
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Project Financial Reports</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">Project Reports</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 max-w-2xl">
            <label className="text-sm font-bold text-textPrimary mb-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Select Project to Analyze
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
              >
                <option value="">-- Choose a Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsProjectPdfDropdownOpen(!isProjectPdfDropdownOpen)}
                  className="px-3.5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs transition-all shadow-2xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-98"
                  title="Pilihan Unduh Dokumen PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PDF</span>
                  <ChevronDown className="w-3 h-3 opacity-75" />
                </button>

                {isProjectPdfDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
                    onClick={() => setIsProjectPdfDropdownOpen(false)}
                  >
                    <button
                      onClick={() => {
                        if (selectedProjectId) {
                          handleDownloadSingleProjectPDF();
                        } else {
                          addToast('warning', 'Pilih Proyek', 'Silakan pilih salah satu proyek terlebih dahulu dari dropdown di samping.');
                        }
                      }}
                      disabled={!selectedProjectId}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center gap-2.5 transition-colors ${
                        selectedProjectId
                          ? 'text-textPrimary hover:bg-primary/10 hover:text-primary cursor-pointer font-medium'
                          : 'text-textSecondary/40 cursor-not-allowed'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="truncate">
                        <span className="block font-semibold">Laporan Proyek Terpilih</span>
                        <span className="text-[10px] text-textSecondary">
                          {selectedProjectId ? 'Sesuai proyek aktif' : 'Pilih proyek terlebih dahulu'}
                        </span>
                      </div>
                    </button>
                    <div className="h-px bg-border/60 my-1"></div>
                    <button
                      onClick={handleDownloadConsolidatedPDF}
                      className="w-full text-left px-3 py-2 text-xs text-textPrimary hover:bg-primary/10 hover:text-primary rounded-lg flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                      <div className="truncate">
                        <span className="block font-semibold">Konsolidasi (Semua Proyek)</span>
                        <span className="text-[10px] text-textSecondary">Laporan gabungan seluruh proyek</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-background p-1.5 rounded-xl border border-border self-start lg:self-end">
            <button
              onClick={() => setActiveReportMode('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeReportMode === 'overview'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary hover:bg-card'
              }`}
            >
              <Activity className="w-4 h-4" />
              Overview & P&L Proyek
            </button>
            <button
              onClick={() => setActiveReportMode('weekly_project')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeReportMode === 'weekly_project'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-textSecondary hover:text-textPrimary hover:bg-card'
              }`}
            >
              <Sparkles className="w-4 h-4 text-secondary" />
              Arus Kas Mingguan
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary uppercase font-bold">Bank</span>
            </button>
            {(!selectedProject || selectedProject.code.includes('IKPT')) && (
              <button
                onClick={() => setActiveReportMode('copy1')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeReportMode === 'copy1'
                    ? 'bg-[#294825] text-white shadow-sm'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-card'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                Copy 1 (Realisasi LPJ)
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 uppercase font-bold">Site</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PROMPT BANNER: WHEN NO PROJECT IS SELECTED */}
      {!selectedProjectId ? (
        <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-textPrimary mb-1">Pilih Proyek Terlebih Dahulu</h3>
          <p className="text-sm text-textSecondary max-w-md mx-auto mb-6">
            Silakan pilih salah satu proyek pada menu dropdown di atas untuk menampilkan analisis Laporan Keuangan, P&L, maupun Arus Kas Mingguan.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {projects.slice(0, 3).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className="px-3.5 py-1.5 bg-background hover:bg-primary/10 border border-border rounded-lg text-xs font-semibold text-textPrimary hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <span>{p.code} - {p.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* VIEW 1: WEEKLY CASHFLOW (BANK / COPY 1) */}
          {(activeReportMode === 'weekly_project' || activeReportMode === 'copy1') && (
            <WeeklyProjectCashflowView
              projectId={selectedProjectId}
              initialTab={activeReportMode}
              onTabChange={(newTab) => setActiveReportMode(newTab)}
            />
          )}

          {/* VIEW 2: PROJECT OVERVIEW & P&L (SELECTED PROJECT) */}
          {activeReportMode === 'overview' && projectData && (
            <div className="space-y-6">
          {/* Project Details Section */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-8 justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-textPrimary">{projectData.project.name}</h2>
              <p className="text-sm font-mono text-textSecondary mt-1">{projectData.project.code}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-textSecondary w-24">Client:</span>
                  <span className="font-medium text-textPrimary">{projectData.customer?.name || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-textSecondary w-24">Address:</span>
                  <span className="font-medium text-textPrimary">{projectData.customer?.address || '-'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-textSecondary w-24">Status:</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold uppercase">{projectData.project.status}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right border-l border-border pl-8 min-w-[200px]">
              <p className="text-sm text-textSecondary mb-1">Contract Budget</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(projectData.budgetIDR)}</p>
              {projectData.budgetUSD > 0 && (
                <p className="text-sm font-medium text-textSecondary mt-1">{formatCurrencyUSD(projectData.budgetUSD)}</p>
              )}
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-sm text-textSecondary mb-1">Gross Profit (Invoiced - Cost)</p>
                <p className={`text-2xl font-bold ${projectData.totalBilled - projectData.totalActualCost >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(projectData.totalBilled - projectData.totalActualCost)}
                </p>
              </div>
            </div>
          </div>

          {/* ===== 1. EXECUTIVE KPI CARDS (ULTRA-PREMIUM 4-CARD GRID) ===== */}
          {(() => {
            const spentPercent = projectData.budgetIDR > 0 ? (projectData.totalActualCost / projectData.budgetIDR) * 100 : 0;
            const remainingPercent = projectData.budgetIDR > 0 ? (projectData.remainingBudget / projectData.budgetIDR) * 100 : 0;
            const billedPercent = projectData.budgetIDR > 0 ? (projectData.totalBilled / projectData.budgetIDR) * 100 : 0;
            const grossProfit = projectData.totalBilled - projectData.totalActualCost;

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. CONTRACT BUDGET */}
                <div className="bg-card border border-border/80 hover:border-primary/60 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-amber-400" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">Contract Budget</span>
                      <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform shadow-xs">
                        <Coins className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-textPrimary tracking-tight">
                      {formatCurrency(projectData.budgetIDR)}
                    </div>
                    {projectData.budgetUSD > 0 && (
                      <p className="text-xs font-mono text-textSecondary mt-1">
                        ≈ {formatCurrencyUSD(projectData.budgetUSD)}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-textSecondary">Nilai Anggaran Disetujui</span>
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-primary/10 text-primary border border-primary/20">
                      100% BASE
                    </span>
                  </div>
                </div>

                {/* 2. ACTUAL COST (SPENT) */}
                <div className="bg-card border border-border/80 hover:border-rose-500/60 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">Actual Cost (Spent)</span>
                      <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl group-hover:scale-110 transition-transform shadow-xs">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                      {formatCurrency(projectData.totalActualCost)}
                    </div>
                    {/* Micro Progress Bar */}
                    <div className="w-full bg-secondary/30 rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div 
                        className="bg-rose-500 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, spentPercent)}%` }} 
                      />
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-textSecondary">Realisasi Biaya</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      spentPercent > 90 
                        ? 'bg-red-500/15 text-red-600 border border-red-500/30' 
                        : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    }`}>
                      {spentPercent.toFixed(1)}% TERPAKAI
                    </span>
                  </div>
                </div>

                {/* 3. REMAINING BUDGET */}
                <div className="bg-card border border-border/80 hover:border-emerald-500/60 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-600" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">Remaining Budget</span>
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform shadow-xs">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                    </div>
                    <div className={`text-2xl font-black tracking-tight ${projectData.remainingBudget >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-danger'}`}>
                      {formatCurrency(projectData.remainingBudget)}
                    </div>
                    <div className="w-full bg-secondary/30 rounded-full h-1.5 mt-2.5 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, remainingPercent))}%` }} 
                      />
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-textSecondary">Sisa Plafon Anggaran</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      projectData.remainingBudget >= 0
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-red-500/15 text-red-600 border border-red-500/30'
                    }`}>
                      {remainingPercent.toFixed(1)}% TERSISA
                    </span>
                  </div>
                </div>

                {/* 4. TOTAL INVOICED (AR) */}
                <div className="bg-card border border-border/80 hover:border-sky-500/60 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-blue-600" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">Total Invoiced (AR)</span>
                      <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl group-hover:scale-110 transition-transform shadow-xs">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-sky-600 dark:text-sky-400 tracking-tight">
                      {formatCurrency(projectData.totalBilled)}
                    </div>
                    <p className="text-xs font-medium text-textSecondary mt-1">
                      Tertagih ke Klien: <span className="font-bold text-textPrimary">{billedPercent.toFixed(1)}%</span>
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-textSecondary">Gross Margin</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${grossProfit >= 0 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/15 text-red-600 border border-red-500/30'}`}>
                      {grossProfit >= 0 ? '+' : ''}{formatCurrency(grossProfit)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ===== 2. MODERN EXECUTIVE ANALYTICS CHARTS (SIDE-BY-SIDE LEGENDS) ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CHART 1: BUDGET UTILIZATION */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-2">
                <div>
                  <h3 className="font-bold text-textPrimary text-base flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-primary" /> Budget Utilization (IDR)
                  </h3>
                  <p className="text-xs text-textSecondary mt-0.5">Rasio serapan biaya operasional terhadap total pagu anggaran</p>
                </div>
                {(() => {
                  const spentPct = projectData.budgetIDR > 0 ? (projectData.totalActualCost / projectData.budgetIDR) * 100 : 0;
                  return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      spentPct > 100 
                        ? 'bg-red-500/15 text-red-600 border border-red-500/30' 
                        : spentPct > 80 
                        ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                    }`}>
                      {spentPct > 100 ? '⚠️ Over Budget' : spentPct > 80 ? '⚡ Warning 80%+' : '✓ Budget Sehat'}
                    </span>
                  );
                })()}
              </div>

              {projectData.budgetIDR > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                  {/* Left: Donut Chart */}
                  <div className="w-full sm:w-[220px] h-[220px] relative flex items-center justify-center shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectData.budgetStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={64}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="transparent"
                        >
                          <Cell key="cell-0" fill="#F43F5E" /> {/* Terpakai -> Rose Red */}
                          <Cell key="cell-1" fill="#10B981" /> {/* Sisa -> Emerald Green */}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => [formatCurrency(value), '']} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Metric Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-textPrimary tracking-tight">
                        {((projectData.totalActualCost / projectData.budgetIDR) * 100).toFixed(1)}%
                      </span>
                      <span className="text-[9px] font-bold text-textSecondary uppercase tracking-widest">
                        TERPAKAI
                      </span>
                    </div>
                  </div>

                  {/* Right: High-End Custom Legend Cards */}
                  <div className="flex-1 w-full space-y-3">
                    <div className="p-3.5 bg-rose-500/5 rounded-2xl border border-rose-500/15 flex items-center justify-between hover:bg-rose-500/10 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0 shadow-xs" />
                        <div>
                          <p className="text-xs font-semibold text-textSecondary">Terpakai (Spent)</p>
                          <p className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                            {formatCurrency(projectData.totalActualCost)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-600 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                        {((projectData.totalActualCost / projectData.budgetIDR) * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="p-3.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/15 flex items-center justify-between hover:bg-emerald-500/10 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                        <div>
                          <p className="text-xs font-semibold text-textSecondary">Sisa Anggaran</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                            {formatCurrency(projectData.remainingBudget)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        {((projectData.remainingBudget / projectData.budgetIDR) * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="px-3.5 py-2 bg-secondary/15 rounded-xl flex items-center justify-between text-xs text-textSecondary">
                      <span>Pagu Kontrak:</span>
                      <span className="font-bold text-textPrimary font-mono">{formatCurrency(projectData.budgetIDR)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-textSecondary text-sm border-2 border-dashed border-border rounded-xl">
                  Contract Budget is zero or not properly defined.
                </div>
              )}
            </div>

            {/* CHART 2: COST BREAKDOWN BY CATEGORY */}
            <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-2">
                <div>
                  <h3 className="font-bold text-textPrimary text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Cost Breakdown by Category
                  </h3>
                  <p className="text-xs text-textSecondary mt-0.5">Komposisi pos biaya pengeluaran aktual yang terpakai</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {projectData.costBreakdown.length} Pos Biaya
                </span>
              </div>

              {projectData.totalActualCost > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                  {/* Left: Donut Chart */}
                  <div className="w-full sm:w-[220px] h-[220px] relative flex items-center justify-center shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectData.costBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={64}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="transparent"
                        >
                          {projectData.costBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => [formatCurrency(value), '']} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Donut Center Metric Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                      <span className="text-xs font-black text-textPrimary tracking-tight leading-tight">
                        {formatCurrency(projectData.totalActualCost)}
                      </span>
                      <span className="text-[9px] font-bold text-textSecondary uppercase tracking-widest mt-0.5">
                        TOTAL AKTUAL
                      </span>
                    </div>
                  </div>

                  {/* Right: High-End Category List (Side by Side) */}
                  <div className="flex-1 w-full max-h-[220px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {projectData.costBreakdown.map((item, index) => {
                      const pct = projectData.totalActualCost > 0 ? (item.value / projectData.totalActualCost) * 100 : 0;
                      const sliceColor = COLORS[index % COLORS.length];
                      return (
                        <div key={index} className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-background/50 hover:bg-secondary/20 transition-all border border-border/40">
                          <div className="flex items-center gap-2.5 min-w-0 mr-2">
                            <div className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: sliceColor }} />
                            <span className="font-semibold text-textPrimary truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono font-bold text-textPrimary text-xs">{formatCurrency(item.value)}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary/30 text-textPrimary shrink-0">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-textSecondary text-sm border-2 border-dashed border-border rounded-xl">
                  No costs recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="h-[500px]">
             <DataTable 
               title="Project Expenses & Invoices" 
               description="Detailed log of all costs attributed to this project."
               columns={transactionColumns}
               data={projectData.transactions}
               searchPlaceholder="Search transactions..."
             />
          </div>

          {/* ===== RAB vs ACTUAL DETAIL TABLE ===== */}
          {rabItems.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold text-textPrimary">Detail RAB vs Aktual per Item Pekerjaan</h3>
                <p className="text-sm text-textSecondary mt-1">Perbandingan anggaran rencana dengan biaya yang sudah dikeluarkan, per baris kegiatan.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-background text-textSecondary">
                    <tr>
                      <th className="px-5 py-3">Item Pekerjaan</th>
                      <th className="px-5 py-3 text-right">Budget (IDR)</th>
                      <th className="px-5 py-3 text-right">Aktual (IDR)</th>
                      <th className="px-5 py-3 text-right">Sisa</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rabItems.map(rab => {
                      // Sum all expenses and AP invoices tagged to this RAB item
                      const actualExp = expenses.filter(e => e.project_id === selectedProjectId && (e as any).project_rab_id === rab.id).reduce((s, e) => s + e.amount, 0);
                      const actualAp = apInvoices.filter(i => i.project_id === selectedProjectId && (i as any).project_rab_id === rab.id).reduce((s, i) => s + i.total_amount, 0);
                      const actual = actualExp + actualAp;
                      const sisa = rab.total_cost_idr - actual;
                      const pct = rab.total_cost_idr > 0 ? Math.round((actual / rab.total_cost_idr) * 100) : 0;
                      const isOver = sisa < 0;
                      return (
                        <tr key={rab.id} className="hover:bg-background/50">
                          <td className="px-5 py-3">
                            <div className="font-medium text-textPrimary">{rab.description}</div>
                            <div className="text-xs text-textSecondary">{rab.category} · {rab.qty} {rab.unit}</div>
                          </td>
                          <td className="px-5 py-3 text-right font-mono">{formatCurrency(rab.total_cost_idr)}</td>
                          <td className="px-5 py-3 text-right font-mono font-medium text-textPrimary">{formatCurrency(actual)}</td>
                          <td className={`px-5 py-3 text-right font-bold ${isOver ? 'text-danger' : 'text-success'}`}>{formatCurrency(sisa)}</td>
                          <td className="px-5 py-3 text-center">
                            {rab.total_cost_idr === 0 ? (
                              <span className="px-2 py-1 rounded text-xs bg-border text-textSecondary">No Budget</span>
                            ) : isOver ? (
                              <span className="px-2 py-1 rounded text-xs bg-danger/10 text-danger font-bold">❌ Over {pct}%</span>
                            ) : pct >= 80 ? (
                              <span className="px-2 py-1 rounded text-xs bg-warning/10 text-warning font-bold">⚠️ {pct}%</span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-success/10 text-success font-bold">✅ {pct}%</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 font-bold">
                      <td className="px-5 py-3 text-textPrimary">TOTAL</td>
                      <td className="px-5 py-3 text-right text-textPrimary">{formatCurrency(rabItems.reduce((s, r) => s + r.total_cost_idr, 0))}</td>
                      <td className="px-5 py-3 text-right text-textPrimary">{formatCurrency(projectData.totalActualCost)}</td>
                      <td className={`px-5 py-3 text-right ${projectData.remainingBudget >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(projectData.remainingBudget)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          {/* ===== REKAPITULASI BERDASARKAN KATEGORI AKUN (COA) TABLE ===== */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-textPrimary text-base">Rekapitulasi Berdasarkan Kategori Akun (COA)</h3>
                <p className="text-sm text-textSecondary mt-0.5">Rincian mutasi Debit dan Kredit per akun COA yang terikat dengan proyek ini.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-background text-textSecondary border-b border-border">
                  <tr>
                    <th className="px-5 py-3 font-semibold w-32">Kode Akun</th>
                    <th className="px-5 py-3 font-semibold">Nama Akun</th>
                    <th className="px-5 py-3 font-semibold text-right w-48">Total Debit (Rp)</th>
                    <th className="px-5 py-3 font-semibold text-right w-48">Total Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projectCoaRecap.length > 0 ? (
                    projectCoaRecap.map(item => (
                      <tr key={item.code} className="hover:bg-background/50 transition-colors">
                        <td className="px-5 py-3 font-mono font-medium text-primary">{item.code}</td>
                        <td className="px-5 py-3 font-medium text-textPrimary">{item.name}</td>
                        <td className="px-5 py-3 text-right font-mono">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
                        <td className="px-5 py-3 text-right font-mono">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-textSecondary">
                        Belum ada mutasi akun jurnal terposting untuk proyek ini.
                      </td>
                    </tr>
                  )}
                </tbody>
                {projectCoaRecap.length > 0 && (
                  <tfoot className="bg-background/80 font-bold border-t border-border">
                    <tr>
                      <td colSpan={2} className="px-5 py-3 text-textPrimary">TOTAL KESELURUHAN</td>
                      <td className="px-5 py-3 text-right font-mono text-textPrimary">
                        {formatCurrency(projectCoaRecap.reduce((sum, i) => sum + i.debit, 0))}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-textPrimary">
                        {formatCurrency(projectCoaRecap.reduce((sum, i) => sum + i.credit, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {selectedTransaction && (
        <JournalDetailModal
          transaction={selectedTransaction}
          journal={findJournalForTransaction(selectedTransaction, journals)}
          coas={coas}
          onClose={() => setSelectedTransaction(null)}
          onUpdated={() => {
            setSelectedTransaction(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
