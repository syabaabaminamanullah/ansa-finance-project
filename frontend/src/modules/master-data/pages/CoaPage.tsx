import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, Sparkles, ShieldAlert, ShieldCheck, ArrowRightLeft, Lock, Trash2, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financialsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  is_active: boolean;
  is_header?: boolean;
  created_at?: string;
}

interface CoaUsage {
  total_usage: number;
  details: {
    journal_lines: number;
    expenses: number;
    fixed_assets: number;
  };
  can_delete_safely: boolean;
}

export function CoaPage() {
  const [coas, setCoas] = useState<ChartOfAccount[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChartOfAccount | null>(null);
  
  // Account Deletion Safety State
  const [usageInfo, setUsageInfo] = useState<CoaUsage | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);
  const [targetRelinkId, setTargetRelinkId] = useState<string>('');
  const [deleteSourceAfterRelink, setDeleteSourceAfterRelink] = useState(true);
  const [relinkMode, setRelinkMode] = useState<'options' | 'relink'>('options');
  
  const [formData, setFormData] = useState<Omit<ChartOfAccount, 'id' | 'created_at'>>({
    account_code: '', 
    account_name: '', 
    account_type: 'Expense', 
    normal_balance: 'Debit', 
    is_active: true,
    is_header: false
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await financialsApi.getCoas();
      const sorted = res.data.sort((a: ChartOfAccount, b: ChartOfAccount) => 
        a.account_code.localeCompare(b.account_code)
      );
      setCoas(sorted);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch COA data. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isNewAccount = (dateStr?: string) => {
    if (!dateStr) return false;
    const createdDate = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  const columns = [
    { 
      header: 'Account Code', 
      accessor: (row: ChartOfAccount) => (
        <span className={`font-mono ${row.is_header ? 'font-black text-amber-500 dark:text-amber-400' : 'text-primary font-medium'}`}>
          {row.account_code}
        </span>
      ),
      className: 'w-32'
    },
    { 
      header: 'Account Name', 
      accessor: (row: ChartOfAccount) => (
        <div className="flex items-center gap-2">
          {row.is_header ? (
            <>
              <span className="font-extrabold text-primary flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary shrink-0" />
                {row.account_name}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 whitespace-nowrap">
                Header
              </span>
            </>
          ) : (
            <span className="font-medium text-textPrimary pl-2">
              {row.account_name}
            </span>
          )}
          {isNewAccount(row.created_at) && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse whitespace-nowrap">
              <Sparkles className="w-3 h-3" /> New
            </span>
          )}
        </div>
      )
    },
    { header: 'Type', accessor: 'account_type' as keyof ChartOfAccount, className: 'text-textSecondary' },
    { header: 'Normal Balance', accessor: 'normal_balance' as keyof ChartOfAccount, className: 'text-textSecondary' },
    { 
      header: 'Status', 
      accessor: (row: ChartOfAccount) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          row.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      className: 'w-24'
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ account_code: '', account_name: '', account_type: 'Expense', normal_balance: 'Debit', is_active: true, is_header: false });
    setIsFormOpen(true);
  };

  const handleEdit = (row: ChartOfAccount) => {
    setEditingItem(row);
    setFormData({ 
      account_code: row.account_code, 
      account_name: row.account_name, 
      account_type: row.account_type,
      normal_balance: row.normal_balance,
      is_active: row.is_active,
      is_header: row.is_header || false
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (row: ChartOfAccount) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
    setRelinkMode('options');
    setTargetRelinkId('');
    setIsCheckingUsage(true);
    try {
      const res = await financialsApi.getCoaUsage(row.id);
      setUsageInfo(res.data);
    } catch {
      setUsageInfo(null);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        await financialsApi.updateCoa(editingItem.id, formData);
        addToast('success', 'COA Diperbarui', `Akun ${formData.account_code} berhasil diperbarui.`);
      } else {
        await financialsApi.createCoa(formData);
        addToast('success', 'COA Ditambahkan', `Akun ${formData.account_code} berhasil dibuat.`);
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Gagal menyimpan. Pastikan data valid.';
      addToast('error', 'Gagal Simpan', typeof errMsg === 'string' ? errMsg : 'Terjadi kesalahan validasi.');
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Direct Safe Delete (Hanya jika 0 transaksi)
  const confirmDirectDelete = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    try {
      await financialsApi.deleteCoa(editingItem.id);
      addToast('success', 'Akun Dihapus', `Akun [${editingItem.account_code} - ${editingItem.account_name}] berhasil dihapus permanen.`);
      await fetchData();
      setIsDeleteOpen(false);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Gagal menghapus akun.';
      addToast('error', 'Proteksi Hapus Akun', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Soft Deactivate (Nonaktifkan Akun)
  const confirmDeactivate = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    try {
      await financialsApi.updateCoa(editingItem.id, { is_active: false });
      addToast('success', 'Akun Dinonaktifkan', `Akun [${editingItem.account_code} - ${editingItem.account_name}] telah dinonaktifkan (diarsipkan).`);
      await fetchData();
      setIsDeleteOpen(false);
    } catch (error: any) {
      addToast('error', 'Gagal Menonaktifkan', error.response?.data?.detail || 'Terjadi kesalahan.');
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Re-link & Migrate Transactions to Another Account
  const confirmRelink = async () => {
    if (!editingItem || !targetRelinkId) {
      addToast('error', 'Pilih Akun Tujuan', 'Silakan pilih akun tujuan pemindahan terlebih dahulu.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await financialsApi.relinkCoa(editingItem.id, {
        target_account_id: targetRelinkId,
        delete_source: deleteSourceAfterRelink
      });
      addToast('success', 'Relink Berhasil', res.data.message || 'Transaksi berhasil dipindahkan.');
      await fetchData();
      setIsDeleteOpen(false);
    } catch (error: any) {
      console.error(error);
      addToast('error', 'Gagal Memindahkan Transaksi', error.response?.data?.detail || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/master-data" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Chart of Account</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Financials</span>
            <span>/</span>
            <span className="text-primary font-medium">COA</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Chart of Account (GL)"
          description="Manage general ledger accounts mapping."
          columns={columns}
          data={coas}
          searchPlaceholder="Search account by code or name..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit Account" : "Add New Account"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Account Code <span className="text-danger">*</span></label>
              <input required type="text" value={formData.account_code} onChange={e => setFormData({...formData, account_code: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. 1000-00"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Status <span className="text-danger">*</span></label>
              <select value={formData.is_active ? 'Active' : 'Inactive'} onChange={e => setFormData({...formData, is_active: e.target.value === 'Active'})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Account Name <span className="text-danger">*</span></label>
            <input required type="text" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Cash in Bank"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Account Type <span className="text-danger">*</span></label>
              <select value={formData.account_type} onChange={e => setFormData({...formData, account_type: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Normal Balance <span className="text-danger">*</span></label>
              <select value={formData.normal_balance} onChange={e => setFormData({...formData, normal_balance: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="Debit">Debit</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-secondary/10 border border-border rounded-lg flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="isHeaderToggle" className="text-xs font-bold text-textPrimary flex items-center gap-1.5 cursor-pointer">
                <Layers className="w-4 h-4 text-primary" />
                Jadikan Sebagai Akun Header (Induk)
              </label>
              <p className="text-[11px] text-textSecondary">
                Akun header berfungsi sebagai payung/grup di laporan keuangan dan tidak dapat dipilih saat input transaksi.
              </p>
            </div>
            <input
              type="checkbox"
              id="isHeaderToggle"
              checked={formData.is_header || false}
              onChange={(e) => setFormData({ ...formData, is_header: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Account</button>
          </div>
        </form>
      </Modal>

      {/* SMART SAFETY & COA DELETION/RELINK PROTECTION MODAL */}
      <Modal 
        isOpen={isDeleteOpen} 
        onClose={() => setIsDeleteOpen(false)} 
        title="Proteksi Keamanan Hapus Akun" 
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 py-2">
          {isCheckingUsage ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-textSecondary">Memeriksa riwayat transaksi akun...</p>
            </div>
          ) : usageInfo && !usageInfo.can_delete_safely ? (
            /* CASE 1: AKUN MEMILIKI TRANSAKSI (PROTECTED) */
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <h4 className="font-bold text-amber-500">Akun Memiliki Transaksi Terkait!</h4>
                  <p className="text-xs text-textSecondary leading-relaxed">
                    Akun <span className="font-mono font-bold text-textPrimary">[{editingItem?.account_code} - {editingItem?.account_name}]</span> memiliki{' '}
                    <span className="font-bold text-amber-500">{usageInfo.total_usage} riwayat transaksi aktif</span>{' '}
                    ({usageInfo.details.journal_lines} baris jurnal, {usageInfo.details.expenses} pengeluaran).
                  </p>
                  <p className="text-xs font-semibold text-textPrimary pt-1">
                    ⚠️ Akun TIDAK BISA dihapus langsung agar saldo & laporan keuangan tidak rusak / selisih.
                  </p>
                </div>
              </div>

              {relinkMode === 'options' ? (
                /* Mode Opsi */
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-medium text-textSecondary">Pilih tindakan aman yang ingin Anda lakukan:</p>

                  {/* Opsi 1: Nonaktifkan (Rekomendasi) */}
                  <div className="p-3.5 border border-border rounded-xl bg-card hover:border-primary/50 transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-textPrimary flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        1. Nonaktifkan Akun (Rekomendasi)
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-success/10 text-success border border-success/20">
                        Paling Aman
                      </span>
                    </div>
                    <p className="text-xs text-textSecondary">
                      Akun tidak akan muncul lagi di formulir input jurnal baru, namun riwayat transaksi dan laporan keuangan masa lalu tetap 100% aman dan utuh.
                    </p>
                    <button 
                      type="button"
                      disabled={isSaving}
                      onClick={confirmDeactivate}
                      className="w-full mt-2 py-2 px-3 bg-secondary/20 hover:bg-secondary/40 text-textPrimary border border-border rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Nonaktifkan Akun Ini
                    </button>
                  </div>

                  {/* Opsi 2: Re-link / Pindahkan Transaksi */}
                  <div className="p-3.5 border border-border rounded-xl bg-card hover:border-warning/50 transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-textPrimary flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-warning" />
                        2. Pindahkan Transaksi (Re-Link) ke Akun Lain
                      </span>
                    </div>
                    <p className="text-xs text-textSecondary">
                      Alihkan seluruh {usageInfo.total_usage} riwayat transaksi ke akun lain yang masih aktif, lalu hapus/nonaktifkan akun ini.
                    </p>
                    <button 
                      type="button"
                      onClick={() => setRelinkMode('relink')}
                      className="w-full mt-2 py-2 px-3 bg-warning/10 hover:bg-warning/20 text-warning border border-warning/30 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Pilih Akun Tujuan & Re-Link
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode Form Re-Link */
                <div className="space-y-3 pt-1 border-t border-border mt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-textPrimary">
                      Pilih Akun Tujuan Pengalihan Transaksi <span className="text-danger">*</span>
                    </label>
                    <select
                      value={targetRelinkId}
                      onChange={(e) => setTargetRelinkId(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary font-mono"
                    >
                      <option value="">-- Pilih Akun Penerima Transaksi --</option>
                      {coas
                        .filter(c => c.id !== editingItem?.id && c.is_active)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            [{c.account_code}] {c.account_name} ({c.account_type})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="delSource"
                      checked={deleteSourceAfterRelink}
                      onChange={(e) => setDeleteSourceAfterRelink(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <label htmlFor="delSource" className="text-xs text-textSecondary cursor-pointer">
                      Hapus permanen akun asal <span className="font-semibold text-textPrimary">[{editingItem?.account_code}]</span> setelah seluruh transaksi dipindahkan.
                    </label>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setRelinkMode('options')}
                      className="flex-1 py-2 px-3 bg-background border border-border rounded-lg text-xs font-medium hover:bg-border/50 text-textPrimary"
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || !targetRelinkId}
                      onClick={confirmRelink}
                      className="flex-1 py-2 px-3 bg-warning text-slate-900 rounded-lg text-xs font-bold hover:bg-warning/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      {isSaving ? 'Memproses Migrasi...' : 'Eksekusi Re-Link'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CASE 2: AKUN KOSONG (0 TRANSAKSI - AMAN DIHAPUS) */
            <div className="flex flex-col items-center text-center space-y-3 py-2">
              <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-textPrimary">Hapus Akun Permanen?</h3>
                <p className="text-xs text-textSecondary mt-1">
                  Akun <span className="font-bold text-textPrimary">[{editingItem?.account_code} - {editingItem?.account_name}]</span> belum memiliki riwayat transaksi terkait.
                </p>
                <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Aman untuk dihapus secara langsung.
                </p>
              </div>
              <div className="flex gap-3 w-full pt-3 border-t border-border mt-2">
                <button 
                  onClick={() => setIsDeleteOpen(false)} 
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-xs font-medium hover:bg-border/50 text-textPrimary cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  disabled={isSaving}
                  onClick={confirmDirectDelete} 
                  className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-xs font-bold hover:bg-danger/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Menghapus...' : 'Ya, Hapus Akun'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
