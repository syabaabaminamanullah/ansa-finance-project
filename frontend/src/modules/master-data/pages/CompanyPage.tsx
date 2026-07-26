import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { organizationApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Company {
  id: string;
  code: string;
  name: string;
  address: string;
  tax_id: string;
  status?: 'Active' | 'Inactive';
  is_active: boolean;
}

export function CompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Company | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Omit<Company, 'id'>>({
    code: '', name: '', address: '', tax_id: '', is_active: true
  });

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await organizationApi.getCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      addToast('error', 'Connection Error', 'Failed to fetch companies.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const columns = [
    { header: 'Company Code', accessor: 'code' as keyof Company, className: 'font-medium text-primary w-32' },
    { header: 'Company Name', accessor: 'name' as keyof Company, className: 'font-bold' },
    { header: 'Address', accessor: 'address' as keyof Company },
    { header: 'NPWP (Tax ID)', accessor: 'tax_id' as keyof Company, className: 'font-mono text-sm text-textSecondary' },
    { 
      header: 'Status', 
      accessor: (row: Company) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          row.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      className: 'w-24'
    },
  ];

  // Actions
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', address: '', tax_id: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: Company) => {
    setEditingItem(row);
    setFormData({ 
      code: row.code, 
      name: row.name, 
      address: row.address, 
      tax_id: row.tax_id, 
      is_active: row.is_active 
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Company) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        await organizationApi.updateCompany(editingItem.id, formData);
        addToast('success', 'Success', 'Company updated successfully.');
      } else {
        await organizationApi.createCompany(formData);
        addToast('success', 'Success', 'Company created successfully.');
      }
      await fetchCompanies();
      setIsFormOpen(false);
    } catch (error: any) {
      console.error('Failed to save company:', error);
      const errMsg = error.response?.data?.detail || 'Failed to save company.';
      addToast('error', 'Error', typeof errMsg === 'string' ? errMsg : 'Validation error.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await organizationApi.deleteCompany(editingItem.id).catch(() => {
           return organizationApi.updateCompany(editingItem.id, { is_active: false });
        });
        addToast('success', 'Success', 'Company deleted.');
        await fetchCompanies();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Error', 'Failed to delete company.');
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
          <h1 className="text-2xl font-bold text-textPrimary">Companies</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Organization</span>
            <span>/</span>
            <span className="text-primary font-medium">Company</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Company Directory"
          description="Manage all legal entities within the organization."
          columns={columns}
          data={companies}
          searchPlaceholder="Search company by name, code or NPWP..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Form Modal */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        title={editingItem ? "Edit Company" : "Add New Company"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Company Code <span className="text-danger">*</span></label>
              <input 
                required
                type="text" 
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
                placeholder="e.g. ANSA01"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Status <span className="text-danger">*</span></label>
              <select 
                value={formData.is_active ? 'Active' : 'Inactive'}
                onChange={e => setFormData({...formData, is_active: e.target.value === 'Active'})}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Company Name <span className="text-danger">*</span></label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
              placeholder="e.g. PT ANSA Geo Teknik"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">NPWP (Tax ID)</label>
            <input 
              type="text" 
              value={formData.tax_id}
              onChange={e => setFormData({...formData, tax_id: e.target.value})}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
              placeholder="e.g. 01.234.567.8-091.000"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Address</label>
            <textarea 
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary min-h-[80px] resize-y"
              placeholder="Full company address..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button 
              type="button" 
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Company
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Confirmation"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3>
            <p className="text-sm text-textSecondary mt-1">
              You are about to delete <span className="font-bold text-textPrimary">{editingItem?.name}</span>. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <button 
              onClick={() => setIsDeleteOpen(false)}
              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDelete}
              className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
