import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Sparkles, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { stakeholdersApi, financialsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Customer {
  id: string;
  code: string;
  name: string;
  npwp?: string;
  address?: string;
  contact?: string;
  bank_id?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  term_of_payment?: string;
  receivable_account_id?: string;
  is_active: boolean;
  created_at?: string;
}

export function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [coas, setCoas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | null>(null);
  
  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'created_at'>>({
    code: '', name: '', npwp: '', address: '', contact: '',
    bank_id: '', bank_account_number: '', bank_account_name: '', term_of_payment: '', receivable_account_id: '',
    is_active: true
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [custRes, bankRes, coaRes] = await Promise.all([
        stakeholdersApi.getCustomers(),
        financialsApi.getBanks(),
        financialsApi.getCoas()
      ]);
      setBanks(bankRes.data);
      setCoas(coaRes.data.filter((c: any) => c.account_type === 'Asset')); // Typically AR is Asset

      // Sort by code
      const sorted = custRes.data.sort((a: Customer, b: Customer) => 
        a.code.localeCompare(b.code)
      );
      setCustomers(sorted);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch customer data.');
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
    { header: 'Customer Code', accessor: 'code' as keyof Customer, className: 'font-mono text-primary w-24' },
    { 
      header: 'Customer Name', 
      accessor: (row: Customer) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{row.name}</span>
            {isNewAccount(row.created_at) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse whitespace-nowrap">
                <Sparkles className="w-3 h-3" /> New
              </span>
            )}
          </div>
          <span className="text-xs text-textSecondary">{row.contact || '-'}</span>
        </div>
      )
    },
    { 
      header: 'Financial Info', 
      accessor: (row: Customer) => (
        <div className="flex flex-col text-xs space-y-1">
           <span className="text-textSecondary"><span className="font-medium text-textPrimary">TOP:</span> {row.term_of_payment || '-'}</span>
           <span className="text-textSecondary"><span className="font-medium text-textPrimary">Bank:</span> {row.bank_account_number ? `***${row.bank_account_number.slice(-4)}` : '-'}</span>
        </div>
      )
    },
    { header: 'NPWP', accessor: 'npwp' as keyof Customer, className: 'text-textSecondary font-mono text-xs' },
    { 
      header: 'Status', 
      accessor: (row: Customer) => (
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
    setFormData({ code: '', name: '', npwp: '', address: '', contact: '', bank_id: '', bank_account_number: '', bank_account_name: '', term_of_payment: '', receivable_account_id: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: Customer) => {
    setEditingItem(row);
    setFormData({ 
      code: row.code, 
      name: row.name, 
      npwp: row.npwp || '',
      address: row.address || '',
      contact: row.contact || '',
      bank_id: row.bank_id || '',
      bank_account_number: row.bank_account_number || '',
      bank_account_name: row.bank_account_name || '',
      term_of_payment: row.term_of_payment || '',
      receivable_account_id: row.receivable_account_id || '',
      is_active: row.is_active 
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Customer) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const payload = { 
      ...formData,
      bank_id: formData.bank_id || null,
      receivable_account_id: formData.receivable_account_id || null
    };

    try {
      if (editingItem) {
        await stakeholdersApi.updateCustomer(editingItem.id, payload);
        addToast('success', 'Customer Updated', `Customer ${formData.code} has been updated.`);
      } else {
        await stakeholdersApi.createCustomer(payload);
        addToast('success', 'Customer Created', `Customer ${formData.code} has been created.`);
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
        await stakeholdersApi.deleteCustomer(editingItem.id).catch(() => stakeholdersApi.updateCustomer(editingItem.id, { is_active: false }));
        addToast('success', 'Customer Deleted', `Customer ${editingItem.code} has been removed.`);
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Delete Failed', 'Could not delete the customer.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-textSecondary animate-pulse">Loading customer data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/master-data" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Customer</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Stakeholders</span>
            <span>/</span>
            <span className="text-primary font-medium">Customer</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Customer Database"
          description="Manage client information, billing, and accounting integration."
          columns={columns}
          data={customers}
          searchPlaceholder="Search customer by code or name..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit Customer" : "Add New Customer"} maxWidth="max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2 flex items-center gap-2"><Building2 className="w-4 h-4"/> General Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Customer Code <span className="text-danger">*</span></label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. CUST-001"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Status <span className="text-danger">*</span></label>
                  <select value={formData.is_active ? 'Active' : 'Inactive'} onChange={e => setFormData({...formData, is_active: e.target.value === 'Active'})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Customer Name <span className="text-danger">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. PT Maju Jaya"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">NPWP</label>
                  <input type="text" value={formData.npwp} onChange={e => setFormData({...formData, npwp: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. 01.234..."/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Contact Person</label>
                  <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. John Doe / 0812..."/>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Address</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="Full address..."/>
              </div>
            </div>

            {/* Financial Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2">Financial Integration</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Term of Payment (TOP)</label>
                <select value={formData.term_of_payment} onChange={e => setFormData({...formData, term_of_payment: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Select TOP...</option>
                  <option value="Cash / COD">Cash / COD</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">AR Account (Account Receivable)</label>
                <select value={formData.receivable_account_id} onChange={e => setFormData({...formData, receivable_account_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Map to COA...</option>
                  {coas.map(c => <option key={c.id} value={c.id}>{c.account_code} - {c.account_name}</option>)}
                </select>
                <p className="text-[10px] text-textSecondary">Default GL account for customer invoices.</p>
              </div>

              <div className="p-3 border border-border rounded-lg bg-secondary/5 space-y-3">
                <h4 className="text-xs font-bold text-textPrimary">Customer Bank Details</h4>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Bank</label>
                  <select value={formData.bank_id} onChange={e => setFormData({...formData, bank_id: e.target.value})} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                    <option value="">Select Bank...</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Account Number</label>
                  <input type="text" value={formData.bank_account_number} onChange={e => setFormData({...formData, bank_account_number: e.target.value})} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. 1234567890"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Account Name</label>
                  <input type="text" value={formData.bank_account_name} onChange={e => setFormData({...formData, bank_account_name: e.target.value})} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. PT Maju Jaya"/>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete <span className="font-bold text-textPrimary">{editingItem?.name}</span>. This action cannot be undone.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
