import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financialsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Bank {
  id: string;
  code: string;
  name: string;
  account_number: string;
  account_name: string;
  currency_id: string;
  currencyName?: string;
  is_active: boolean;
}

export function BankPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Bank | null>(null);
  
  const [formData, setFormData] = useState<Omit<Bank, 'id' | 'currencyName'>>({
    code: '', name: '', account_number: '', account_name: '', currency_id: '', is_active: true
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [bankRes, curRes] = await Promise.all([
        financialsApi.getBanks(),
        financialsApi.getCurrencies()
      ]);
      setCurrencies(curRes.data);
      
      const banksWithCurrency = bankRes.data.map((b: any) => ({
        ...b,
        currencyName: curRes.data.find((c: any) => c.id === b.currency_id)?.code || 'Unknown'
      }));
      setBanks(banksWithCurrency);
    } catch (error) {
      addToast('error', 'Connection Error', 'Failed to fetch banks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { header: 'Bank Code', accessor: 'code' as keyof Bank, className: 'font-bold text-primary w-32' },
    { header: 'Bank Name', accessor: 'name' as keyof Bank },
    { header: 'Acc. Number', accessor: 'account_number' as keyof Bank, className: 'font-mono' },
    { header: 'Acc. Name', accessor: 'account_name' as keyof Bank },
    { header: 'Currency', accessor: 'currencyName' as keyof Bank, className: 'text-textSecondary' },
    { 
      header: 'Status', 
      accessor: (row: Bank) => (
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
    setFormData({ code: '', name: '', account_number: '', account_name: '', currency_id: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: Bank) => {
    setEditingItem(row);
    setFormData({ 
      code: row.code, 
      name: row.name, 
      account_number: row.account_number,
      account_name: row.account_name,
      currency_id: row.currency_id,
      is_active: row.is_active 
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Bank) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        await financialsApi.updateBank(editingItem.id, formData);
        addToast('success', 'Success', 'Bank updated successfully.');
      } else {
        await financialsApi.createBank(formData);
        addToast('success', 'Success', 'Bank created successfully.');
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {
      const errMsg = error.response?.data?.detail || 'Failed to save.';
      addToast('error', 'Error', typeof errMsg === 'string' ? errMsg : 'Validation error.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await financialsApi.deleteBank(editingItem.id).catch(() => financialsApi.updateBank(editingItem.id, { is_active: false }));
        addToast('success', 'Success', 'Bank deleted.');
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Error', 'Failed to delete bank.');
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
          <h1 className="text-2xl font-bold text-textPrimary">Banks</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Financials</span>
            <span>/</span>
            <span className="text-primary font-medium">Bank</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Bank Directory"
          description="Manage corporate bank accounts."
          columns={columns}
          data={banks}
          searchPlaceholder="Search bank by code or account..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit Bank" : "Add New Bank"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Bank Code <span className="text-danger">*</span></label>
              <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. BCA-01"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Bank Name <span className="text-danger">*</span></label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Bank Central Asia"/>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Account Number <span className="text-danger">*</span></label>
              <input required type="text" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. 123456789"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Account Name <span className="text-danger">*</span></label>
              <input required type="text" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. PT ANSA Geo Teknik"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Currency <span className="text-danger">*</span></label>
              <select required value={formData.currency_id} onChange={e => setFormData({...formData, currency_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="" disabled>Select Currency...</option>
                {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Status <span className="text-danger">*</span></label>
              <select value={formData.is_active ? 'Active' : 'Inactive'} onChange={e => setFormData({...formData, is_active: e.target.value === 'Active'})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Bank</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete <span className="font-bold text-textPrimary">{editingItem?.name}</span>. This action cannot be undone.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
