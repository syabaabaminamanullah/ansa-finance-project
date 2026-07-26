import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Sparkles } from 'lucide-react';
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
  created_at?: string;
}

export function CoaPage() {
  const [coas, setCoas] = useState<ChartOfAccount[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChartOfAccount | null>(null);
  
  const [formData, setFormData] = useState<Omit<ChartOfAccount, 'id' | 'created_at'>>({
    account_code: '', account_name: '', account_type: 'Revenue', normal_balance: 'Credit', is_active: true
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await financialsApi.getCoas();
      // Sort by account code
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
    { header: 'Account Code', accessor: 'account_code' as keyof ChartOfAccount, className: 'font-mono text-primary w-32' },
    { 
      header: 'Account Name', 
      accessor: (row: ChartOfAccount) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{row.account_name}</span>
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
    setFormData({ account_code: '', account_name: '', account_type: 'Revenue', normal_balance: 'Credit', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: ChartOfAccount) => {
    setEditingItem(row);
    setFormData({ 
      account_code: row.account_code, 
      account_name: row.account_name, 
      account_type: row.account_type,
      normal_balance: row.normal_balance,
      is_active: row.is_active 
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: ChartOfAccount) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        await financialsApi.updateCoa(editingItem.id, formData);
        addToast('success', 'COA Updated', `Account ${formData.account_code} has been updated.`);
      } else {
        await financialsApi.createCoa(formData);
        addToast('success', 'COA Created', `Account ${formData.account_code} has been created.`);
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Failed to save. Ensure data is valid.';
      addToast('error', 'Save Failed', typeof errMsg === 'string' ? errMsg : 'Validation error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await financialsApi.deleteCoa(editingItem.id).catch(() => financialsApi.updateCoa(editingItem.id, { is_active: false }));
        addToast('success', 'COA Deleted', `Account ${editingItem.account_code} has been removed.`);
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Delete Failed', 'Could not delete the account.');
      } finally {
        setIsSaving(false);
      }
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

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Account</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete <span className="font-bold text-textPrimary">{editingItem?.account_name}</span>. This action cannot be undone.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
