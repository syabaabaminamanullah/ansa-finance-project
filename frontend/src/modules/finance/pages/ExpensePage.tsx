import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { CoaSelect } from '../../../components/ui/CoaSelect';
import { DatePicker } from '../../../components/ui/DatePicker';
import { MonthPicker } from '../../../components/ui/MonthPicker';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, financialsApi, projectsApi, rabApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Project {
  id: string;
  name: string;
  code: string;
}

interface COA {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface Expense {
  id: string;
  expense_number: string;
  date: string;
  project_id?: string;
  project_rab_id?: string;
  description: string;
  amount: number;
  expense_account_id: string;
  payment_account_id: string;
  status: string;
  journal_status?: 'Posted' | 'Draft' | string;
  journal_number?: string;
  admin_fee_amount?: number;
  admin_fee_account_id?: string;
}

export function ExpensePage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const cached = sessionStorage.getItem(`ansa_exp_${month}`);
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
  const [coas, setCoas] = useState<COA[]>(() => {
    try {
      const cached = sessionStorage.getItem('ansa_coas_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [rabItems, setRabItems] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const month = new Date().toISOString().slice(0, 7);
      return !sessionStorage.getItem(`ansa_exp_${month}`);
    } catch {
      return true;
    }
  });
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Expense | null>(null);
  const [hasAdminFee, setHasAdminFee] = useState(false);
  
  const [formData, setFormData] = useState<Omit<Expense, 'id' | 'created_at'>>({
    expense_number: '', date: '', project_id: '', project_rab_id: '', description: '', amount: 0, expense_account_id: '', payment_account_id: '', status: 'Paid', admin_fee_amount: 0, admin_fee_account_id: ''
  });

  const fetchData = async () => {
    try {
      const cachedMonth = sessionStorage.getItem(`ansa_exp_${selectedMonth}`);
      if (cachedMonth) {
        setExpenses(JSON.parse(cachedMonth));
      } else {
        setIsLoading(true);
      }

      const promises: [Promise<any>, Promise<any>?, Promise<any>?] = [
        financeApi.getExpenses(selectedMonth)
      ];

      if (projects.length === 0) promises.push(projectsApi.getProjects());
      if (coas.length === 0) promises.push(financialsApi.getCoas());

      const [expRes, projRes, coasRes] = await Promise.all(promises);

      const sortedExpenses = (expRes.data || []).sort((a: Expense, b: Expense) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setExpenses(sortedExpenses);

      if (projRes) {
        setProjects(projRes.data || []);
        try { sessionStorage.setItem('ansa_projects_cache', JSON.stringify(projRes.data)); } catch (_) {}
      }
      if (coasRes) {
        const sortedCoas = (coasRes.data || []).sort((a: COA, b: COA) => a.account_code.localeCompare(b.account_code));
        setCoas(sortedCoas);
        try { sessionStorage.setItem('ansa_coas_cache', JSON.stringify(sortedCoas)); } catch (_) {}
      }

      try {
        sessionStorage.setItem(`ansa_exp_${selectedMonth}`, JSON.stringify(sortedExpenses));
      } catch (_) {}
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch expense data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const columns = [
    { header: 'Expense No', accessor: 'expense_number' as keyof Expense, className: 'font-mono text-primary font-bold' },
    { header: 'Date', accessor: 'date' as keyof Expense },
    { 
      header: 'Project', 
      accessor: (row: Expense) => {
        if (!row.project_id) return '-';
        const project = projects.find(p => p.id === row.project_id);
        return project ? project.name : 'Unknown';
      },
      className: 'text-textSecondary'
    },
    { header: 'Description', accessor: 'description' as keyof Expense },
    { 
      header: 'Total Deducted', 
      accessor: (row: Expense) => formatCurrency(row.amount + (row.admin_fee_amount || 0)),
      className: 'text-right font-semibold'
    },
    {
      header: 'Status Jurnal',
      accessor: (row: Expense) => {
        const isPosted = row.journal_status === 'Posted';
        return (
          <span 
            title={isPosted ? `Jurnal ${row.journal_number || ''} Berstatus Posted (Terkunci)` : 'Jurnal Belum Diposting (Draft)'}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold select-none ${
              isPosted 
                ? 'bg-success/10 text-success border border-success/20' 
                : 'bg-warning/10 text-warning border border-warning/20'
            }`}
          >
            {isPosted ? 'Posted' : 'Draft'}
          </span>
        );
      },
      className: 'w-28 text-center'
    }
  ];

  const handleAdd = async () => {
    setEditingItem(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({ 
      expense_number: 'Memuat...', 
      date: today, 
      project_id: '',
      description: '', 
      amount: 0, 
      expense_account_id: '', 
      payment_account_id: '', 
      status: 'Paid',
      admin_fee_amount: 0,
      admin_fee_account_id: ''
    });
    setHasAdminFee(false);
    setIsFormOpen(true);
    try {
      const res = await financeApi.getNextExpenseNumber(today);
      if (res.data?.next_number) {
        setFormData(prev => ({ ...prev, expense_number: res.data.next_number }));
      }
    } catch (err) {
      console.error('Failed to get next expense number:', err);
    }
  };

  const handleDateChange = async (newDate: string) => {
    setFormData(prev => ({ ...prev, date: newDate }));
    if (!editingItem && newDate) {
      try {
        const res = await financeApi.getNextExpenseNumber(newDate);
        if (res.data?.next_number) {
          setFormData(prev => ({ ...prev, expense_number: res.data.next_number }));
        }
      } catch (err) {
        console.error('Failed to get next expense number:', err);
      }
    }
  };

  const handleViewClick = (row: Expense) => {
    setEditingItem(row);
    setIsViewOpen(true);
  };

  const handleEditClick = async (row: Expense) => {
    if (row.journal_status === 'Posted') {
      addToast(
        'warning', 
        'Aksi Ditolak', 
        `Expense ${row.expense_number} terkunci karena jurnal terkait (${row.journal_number || 'JV'}) berstatus POSTED. Silakan Unpost terlebih dahulu di menu All Journal Entries jika ingin mengedit.`
      );
      return;
    }
    setEditingItem(row);
    setFormData({ 
      expense_number: row.expense_number, 
      date: row.date, 
      project_id: row.project_id || '',
      description: row.description, 
      amount: row.amount, 
      expense_account_id: row.expense_account_id, 
      payment_account_id: row.payment_account_id, 
      status: row.status || 'Paid',
      admin_fee_amount: row.admin_fee_amount || 0,
      admin_fee_account_id: row.admin_fee_account_id || '',
      project_rab_id: (row as any).project_rab_id || ''
    });
    setHasAdminFee(Boolean(row.admin_fee_amount && row.admin_fee_amount > 0));
    if (row.project_id) {
      try {
        const r = await rabApi.getByProject(row.project_id);
        setRabItems(r.data);
      } catch {
        setRabItems([]);
      }
    } else {
      setRabItems([]);
    }
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Expense) => {
    if (row.journal_status === 'Posted') {
      addToast(
        'warning', 
        'Aksi Ditolak', 
        `Expense ${row.expense_number} terkunci karena jurnal terkait (${row.journal_number || 'JV'}) berstatus POSTED. Silakan Unpost terlebih dahulu di menu All Journal Entries jika ingin menghapus.`
      );
      return;
    }
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expense_account_id || !formData.payment_account_id) {
      addToast('error', 'Validation Error', 'Please select both Expense and Payment accounts.');
      return;
    }
    
    // Optional project ID
    const payload = { ...formData };
    if (!payload.project_id) {
      payload.project_id = null as any;
    }
    
    // Optional admin fee
    if (!hasAdminFee || !payload.admin_fee_account_id) {
      payload.admin_fee_amount = 0;
      delete (payload as any).admin_fee_account_id;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await financeApi.updateExpense(editingItem.id, payload);
        addToast('success', 'Expense Diperbarui', `Expense ${formData.expense_number} dan ayat jurnal otomatis berhasil disinkronkan.`);
      } else {
        await financeApi.createExpense(payload);
        addToast('success', 'Expense Recorded', `Expense ${formData.expense_number} recorded. Auto-journal generated successfully.`);
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Failed to save.';
      addToast('error', 'Save Failed', typeof errMsg === 'string' ? errMsg : 'Validation error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await financeApi.deleteExpense(editingItem.id);
        addToast('success', 'Expense Deleted', `Expense ${editingItem.expense_number} and its Auto-journal have been removed.`);
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error: any) {
        const errMsg = error.response?.data?.detail || 'Could not delete the expense.';
        addToast('error', 'Hapus Ditolak', typeof errMsg === 'string' ? errMsg : 'Gagal menghapus expense.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Filter COAs for dropdowns
  const expenseAccounts = coas.filter(c => c.account_type.toLowerCase() === 'expense');
  const paymentAccounts = coas.filter(c => c.account_type.toLowerCase() === 'asset'); // Cash/Bank are assets

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Direct Expenses (Kas Kecil)</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">Expenses</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MonthPicker 
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
            align="right"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Direct Expenses"
          description="Manage operational claims and expenses. System auto-generates journals for these entries."
          columns={columns}
          data={expenses}
          searchPlaceholder="Search description or expense no..."
          isLoading={isLoading}
          onAdd={handleAdd}
          onView={handleViewClick}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          isActionDisabled={(row) => {
            if (row.journal_status === 'Posted') {
              return {
                disabled: true,
                message: `Terkunci: Jurnal ${row.journal_number || ''} berstatus POSTED. Silakan Unpost di All Journal Entries terlebih dahulu.`
              };
            }
            return false;
          }}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit Expense" : "Record New Expense"} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="p-3 mb-2 bg-primary/10 border border-primary/20 text-primary text-sm rounded-lg flex gap-2">
            <strong>Info:</strong> Saving this expense will automatically create a balanced Journal Entry (Debit: Expense, Credit: Payment Account).
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-textPrimary">Expense No. <span className="text-danger">*</span></label>
                <span className="text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                  Otomatis
                </span>
              </div>
              <input 
                required 
                readOnly 
                type="text" 
                value={formData.expense_number} 
                title="Nomor Expense dihitung otomatis secara berurutan oleh sistem"
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-primary font-mono font-bold cursor-not-allowed select-none shadow-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Date <span className="text-danger">*</span></label>
              <DatePicker
                required
                value={formData.date}
                onChange={(val) => handleDateChange(val)}
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Related Project (Optional)</label>
            <select value={formData.project_id} onChange={async e => {
              const pid = e.target.value;
              setFormData({...formData, project_id: pid, project_rab_id: ''});
              if (pid) {
                try { const r = await rabApi.getByProject(pid); setRabItems(r.data); } catch { setRabItems([]); }
              } else { setRabItems([]); }
            }} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
              <option value="">-- Tidak Ada Proyek (Overhead Kantor) --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
            </select>
          </div>

          {/* RAB Allocation - shows when project is selected and has RAB items */}
          {formData.project_id && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Alokasi RAB / Pos Anggaran <span className="text-xs text-textSecondary">(Opsional)</span></label>
              <select value={formData.project_rab_id} onChange={e => setFormData({...formData, project_rab_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
                <option value="">-- Biaya Proyek Umum (tanpa alokasi RAB) --</option>
                {rabItems.map(r => <option key={r.id} value={r.id}>{r.category} → {r.description}</option>)}
              </select>
              <p className="text-[11px] text-textSecondary">Pilih pos RAB agar biaya ini tercatat pada anggaran spesifik proyek.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Description <span className="text-danger">*</span></label>
            <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Client meeting for planning phase"/>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border mt-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Expense Category (Debit) <span className="text-danger">*</span></label>
              <CoaSelect
                required
                placement="top"
                align="left"
                popupWidth="w-[440px] sm:w-[500px] md:w-[540px]"
                accounts={expenseAccounts}
                value={formData.expense_account_id}
                onChange={(val) => setFormData({ ...formData, expense_account_id: val })}
                placeholder="-- Pilih Akun Biaya (Debit) --"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Paid Via (Credit) <span className="text-danger">*</span></label>
              <CoaSelect
                required
                placement="top"
                align="right"
                popupWidth="w-[440px] sm:w-[500px] md:w-[540px]"
                accounts={paymentAccounts}
                value={formData.payment_account_id}
                onChange={(val) => setFormData({ ...formData, payment_account_id: val })}
                placeholder="-- Pilih Akun Kas/Bank (Credit) --"
              />
            </div>
          </div>

          <div className="space-y-1.5 mt-4">
            <label className="text-sm font-medium text-textPrimary">Expense Amount (Rp) <span className="text-danger">*</span></label>
            <input required type="text" value={formData.amount === 0 ? '' : new Intl.NumberFormat('id-ID').format(formData.amount)} onChange={e => {
              const val = e.target.value.replace(/\D/g, '');
              setFormData({...formData, amount: Number(val)});
            }} className="w-full px-4 py-3 bg-card border-2 border-primary/20 rounded-lg text-lg text-primary font-bold text-right focus:border-primary focus:ring-0" placeholder="0"/>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border mt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-textPrimary cursor-pointer">
              <input type="checkbox" checked={hasAdminFee} onChange={e => setHasAdminFee(e.target.checked)} className="rounded border-border text-primary focus:ring-primary"/>
              Include Bank Administration Fee?
            </label>
          </div>

          {hasAdminFee && (
            <div className="grid grid-cols-2 gap-4 bg-background p-3 rounded-lg border border-border mt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Admin Fee Account <span className="text-danger">*</span></label>
                <CoaSelect
                  required={hasAdminFee}
                  placement="top"
                  align="left"
                  popupWidth="w-[440px] sm:w-[500px] md:w-[540px]"
                  accounts={expenseAccounts}
                  value={formData.admin_fee_account_id || ''}
                  onChange={(val) => setFormData({ ...formData, admin_fee_account_id: val })}
                  placeholder="-- Pilih Akun Biaya Admin --"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Admin Fee Amount (Rp) <span className="text-danger">*</span></label>
                <input required={hasAdminFee} type="text" value={formData.admin_fee_amount === 0 ? '' : new Intl.NumberFormat('id-ID').format(formData.admin_fee_amount || 0)} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({...formData, admin_fee_amount: Number(val)});
                }} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="0"/>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center bg-primary/5 p-4 rounded-lg border border-primary/20 mt-4">
            <span className="font-bold text-textPrimary text-sm">Total Deducted from Bank</span>
            <span className="font-bold text-primary text-xl">{formatCurrency(formData.amount + (hasAdminFee ? formData.admin_fee_amount || 0 : 0))}</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary cursor-pointer">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
              <Save className="w-4 h-4" /> 
              <span>{editingItem ? 'Simpan & Sinkronkan Jurnal' : 'Save & Generate Journal'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Expense Details" maxWidth="max-w-xl">
        {editingItem && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 pb-4 border-b border-border">
              <div>
                <p className="text-sm text-textSecondary">Expense No.</p>
                <p className="font-bold font-mono text-primary text-lg">{editingItem.expense_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-textSecondary">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mt-1 ${
                  editingItem.status === 'Paid' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                }`}>
                  {editingItem.status}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Date</p>
                <p className="font-medium text-textPrimary">{editingItem.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Project</p>
                <p className="font-medium text-textPrimary">{projects.find(p => p.id === editingItem.project_id)?.name || '-'}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-textSecondary mb-1">Description</p>
              <p className="text-sm text-textPrimary p-3 bg-background border border-border rounded-lg">{editingItem.description}</p>
            </div>
            
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h4 className="font-bold text-primary mb-3">Financial Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Expense Category</span>
                  <span className="font-medium text-textPrimary">{coas.find(c => c.id === editingItem.expense_account_id)?.account_name || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Paid Via</span>
                  <span className="font-medium text-textPrimary">{coas.find(c => c.id === editingItem.payment_account_id)?.account_name || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Expense Amount</span>
                  <span className="font-medium text-textPrimary">{formatCurrency(editingItem.amount)}</span>
                </div>
                {editingItem.admin_fee_amount && editingItem.admin_fee_amount > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">Bank Admin Fee</span>
                    <span className="font-medium text-textPrimary">{coas.find(c => c.id === editingItem.admin_fee_account_id)?.account_name || '-'} ({formatCurrency(editingItem.admin_fee_amount)})</span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-2 border-t border-primary/20 mt-2">
                  <span className="font-bold text-textPrimary">Total Deducted</span>
                  <span className="font-bold text-primary">{formatCurrency(editingItem.amount + (editingItem.admin_fee_amount || 0))}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <button type="button" onClick={() => setIsViewOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete expense <span className="font-bold text-textPrimary">{editingItem?.expense_number}</span>. The associated journal will also be deleted.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
