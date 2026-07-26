import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financialsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface TaxCode {
  id: string;
  code: string;
  name: string;
  rate: string;
  description?: string;
  is_active: boolean;
}

export function TaxPage() {
  const [taxes, setTaxes] = useState<TaxCode[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TaxCode | null>(null);
  
  const [formData, setFormData] = useState<Omit<TaxCode, 'id'>>({
    code: '', name: '', rate: '', description: '', is_active: true
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await financialsApi.getTaxes();
      setTaxes(res.data);
    } catch (error) {
      addToast('error', 'Connection Error', 'Failed to fetch taxes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { header: 'Tax Code', accessor: 'code' as keyof TaxCode, className: 'font-bold text-primary w-32' },
    { header: 'Tax Name', accessor: 'name' as keyof TaxCode },
    { 
      header: 'Rate (%)', 
      accessor: (row: TaxCode) => `${row.rate}%`,
      className: 'font-medium w-24'
    },
    { header: 'Description', accessor: 'description' as keyof TaxCode, className: 'text-textSecondary' },
    { 
      header: 'Status', 
      accessor: (row: TaxCode) => (
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
    setFormData({ code: '', name: '', rate: '', description: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: TaxCode) => {
    setEditingItem(row);
    setFormData({ 
      code: row.code, 
      name: row.name, 
      rate: row.rate,
      description: row.description || '',
      is_active: row.is_active 
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: TaxCode) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        await financialsApi.updateTax(editingItem.id, formData);
        addToast('success', 'Success', 'Tax Code updated successfully.');
      } else {
        await financialsApi.createTax(formData);
        addToast('success', 'Success', 'Tax Code created successfully.');
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
        await financialsApi.deleteTax(editingItem.id).catch(() => financialsApi.updateTax(editingItem.id, { is_active: false }));
        addToast('success', 'Success', 'Tax Code deleted.');
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Error', 'Failed to delete tax code.');
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
          <h1 className="text-2xl font-bold text-textPrimary">Tax Codes</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Financials</span>
            <span>/</span>
            <span className="text-primary font-medium">Tax Code</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Tax Code Directory"
          description="Manage tax rates and mapping rules for transactions."
          columns={columns}
          data={taxes}
          searchPlaceholder="Search tax by code or name..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit Tax Code" : "Add New Tax Code"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Tax Code <span className="text-danger">*</span></label>
              <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. PPN11"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Rate (%) <span className="text-danger">*</span></label>
              <input required type="number" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. 11"/>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Tax Name <span className="text-danger">*</span></label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. PPN Keluaran 11%"/>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary min-h-[80px]" placeholder="Optional description..."/>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Status <span className="text-danger">*</span></label>
            <select value={formData.is_active ? 'Active' : 'Inactive'} onChange={e => setFormData({...formData, is_active: e.target.value === 'Active'})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Tax Code</button>
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
