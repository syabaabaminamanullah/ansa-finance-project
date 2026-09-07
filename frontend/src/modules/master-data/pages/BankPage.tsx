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
  coa_account_id?: string;
  coa_account_code?: string;
  coa_account_name?: string;
  is_active: boolean;
}

export function BankPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [coas, setCoas] = useState<any[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Bank | null>(null);
  
  const [formData, setFormData] = useState<Omit<Bank, 'id' | 'currencyName' | 'coa_account_code' | 'coa_account_name'>>({
    code: '', name: '', account_number: '', account_name: '', currency_id: '', coa_account_id: '', is_active: true
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [bankRes, curRes, coaRes] = await Promise.all([
        financialsApi.getBanks(),
        financialsApi.getCurrencies(),
        financialsApi.getCoas()
      ]);
      setCurrencies(curRes.data);
      setCoas(coaRes.data);
      
      const banksWithDetails = bankRes.data.map((b: any) => {
        const coa = coaRes.data.find((c: any) => c.id === b.coa_account_id);
        return {
          ...b,
          currencyName: curRes.data.find((c: any) => c.id === b.currency_id)?.code || 'Unknown',
          coa_account_code: coa ? coa.account_code : b.coa_account?.account_code || '',
          coa_account_name: coa ? coa.account_name : b.coa_account?.account_name || ''
        };
      });
      setBanks(banksWithDetails);
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
    { header: 'Bank Code', accessor: 'code' as keyof Bank, className: 'font-bold text-primary w-28' },
    { header: 'Bank Name', accessor: 'name' as keyof Bank },
    { 
      header: 'Linked COA (Buku Besar)', 
      accessor: (row: Bank) => (
        row.coa_account_code ? (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs">
              {row.coa_account_code}
            </span>
            <span className="text-textSecondary text-xs truncate max-w-[160px]">
              {row.coa_account_name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-textSecondary/50 italic">Unlinked</span>
        )
      ),
    },
    { header: 'Acc. Number', accessor: 'account_number' as keyof Bank, className: 'font-mono' },
    { header: 'Acc. Name', accessor: 'account_name' as keyof Bank },
    { header: 'Currency', accessor: 'currencyName' as keyof Bank, className: 'text-textSecondary w-20' },
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
    setFormData({ code: '', name: '', account_number: '', account_name: '', currency_id: '', coa_account_id: '', is_active: true });
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
      coa_account_id: row.coa_account_id || '',
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
          {/* Linked COA Selection */}
          <div className="space-y-1.5 p-3.5 bg-secondary/15 rounded-xl border border-primary/20">
            <label className="text-sm font-semibold text-textPrimary flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Linked COA Account (Akun Buku Besar)
              </span>
              <span className="text-xs text-primary font-medium">Wajib untuk integrasi laporan & kas</span>
            </label>
            <select 
              value={formData.coa_account_id || ''} 
              onChange={e => {
                const selectedId = e.target.value;
                const selectedCoa = coas.find((c: any) => c.id === selectedId);
                setFormData(prev => ({
                  ...prev,
                  coa_account_id: selectedId,
                  name: prev.name ? prev.name : (selectedCoa?.account_name || ''),
                  code: prev.code ? prev.code : (selectedCoa ? `${selectedCoa.account_name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase()}-IDR` : '')
                }));
              }} 
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary font-mono"
            >
              <option value="">-- Pilih Akun Kas/Bank di COA --</option>
              {coas
                .filter((c: any) => c.account_code.startsWith('111') || c.account_code.startsWith('112') || c.account_type === 'Asset')
                .sort((a: any, b: any) => (a.account_code || '').localeCompare(b.account_code || ''))
                .map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.account_code}] {c.account_name} ({c.account_type})
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-textSecondary">
              Pilih akun kas/bank dari Chart of Accounts (COA) yang mewakili rekening ini (misal: 11210 - Bank Mandiri IDR).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Bank Code <span className="text-danger">*</span></label>
              <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. MDR-IDR"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Bank Name <span className="text-danger">*</span></label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Bank Mandiri IDR"/>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Account Number (No. Rekening) <span className="text-danger">*</span></label>
              <input required type="text" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary font-mono" placeholder="e.g. 103-00-1332575-4"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Account Name (Atas Nama) <span className="text-danger">*</span></label>
              <input required type="text" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. PT Geo Terra"/>
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
