import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { organizationApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Branch {
  id: string;
  company_id: string;
  code: string;
  name: string;
  is_active: boolean;
  companyName?: string; // For display if joined
}

export function BranchPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Branch | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Omit<Branch, 'id' | 'companyName'>>({
    company_id: '', code: '', name: '', is_active: true
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [branchRes, companyRes] = await Promise.all([
        organizationApi.getBranches(),
        organizationApi.getCompanies()
      ]);
      
      setCompanies(companyRes.data);
      
      // Map company name for display
      const branchesWithCompany = branchRes.data.map((b: any) => ({
        ...b,
        companyName: companyRes.data.find((c: any) => c.id === b.company_id)?.name || 'Unknown'
      }));
      
      setBranches(branchesWithCompany);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch branch data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { header: 'Branch Code', accessor: 'code' as keyof Branch, className: 'font-medium text-primary w-32' },
    { header: 'Branch Name', accessor: 'name' as keyof Branch, className: 'font-bold' },
    { header: 'Company', accessor: 'companyName' as keyof Branch, className: 'text-textSecondary' },
    { 
      header: 'Status', 
      accessor: (row: Branch) => (
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
    setFormData({ company_id: '', code: '', name: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: Branch) => {
    setEditingItem(row);
    setFormData({ 
      company_id: row.company_id,
      code: row.code, 
      name: row.name, 
      is_active: row.is_active 
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Branch) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        await organizationApi.updateBranch(editingItem.id, formData);
        addToast('success', 'Success', 'Branch updated successfully.');
      } else {
        await organizationApi.createBranch(formData);
        addToast('success', 'Success', 'Branch created successfully.');
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {
      console.error('Failed to save branch:', error);
      const errMsg = error.response?.data?.detail || 'Failed to save branch.';
      addToast('error', 'Error', typeof errMsg === 'string' ? errMsg : 'Validation error.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await organizationApi.deleteBranch(editingItem.id).catch(() => {
           return organizationApi.updateBranch(editingItem.id, { is_active: false });
        });
        addToast('success', 'Success', 'Branch deleted.');
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Error', 'Failed to delete branch.');
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
          <h1 className="text-2xl font-bold text-textPrimary">Branches</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Organization</span>
            <span>/</span>
            <span className="text-primary font-medium">Branch</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Branch Directory"
          description="Manage branch offices operating under companies."
          columns={columns}
          data={branches}
          searchPlaceholder="Search branch by name or code..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Form Modal */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        title={editingItem ? "Edit Branch" : "Add New Branch"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Company <span className="text-danger">*</span></label>
            <select 
              required
              value={formData.company_id}
              onChange={e => setFormData({...formData, company_id: e.target.value})}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
            >
              <option value="" disabled>Select Company...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Branch Code <span className="text-danger">*</span></label>
              <input 
                required
                type="text" 
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
                placeholder="e.g. JKT"
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
            <label className="text-sm font-medium text-textPrimary">Branch Name <span className="text-danger">*</span></label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
              placeholder="e.g. Jakarta HQ"
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
              Save Branch
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
