import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { organizationApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface CostCenter {
  id: string;
  branch_id: string;
  code: string;
  name: string;
  is_active: boolean;
  branchName?: string;
}

export function CostCenterPage() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostCenter | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Omit<CostCenter, 'id' | 'branchName'>>({
    branch_id: '', code: '', name: '', is_active: true
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [ccRes, branchRes] = await Promise.all([
        organizationApi.getCostCenters(),
        organizationApi.getBranches()
      ]);
      
      setBranches(branchRes.data);
      
      // Map branch name for display
      const ccWithBranch = ccRes.data.map((cc: any) => ({
        ...cc,
        branchName: branchRes.data.find((b: any) => b.id === cc.branch_id)?.name || 'Unknown'
      }));
      
      setCostCenters(ccWithBranch);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch cost center data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { header: 'Cost Center Code', accessor: 'code' as keyof CostCenter, className: 'font-medium text-primary w-40' },
    { header: 'Cost Center Name', accessor: 'name' as keyof CostCenter, className: 'font-bold' },
    { header: 'Branch', accessor: 'branchName' as keyof CostCenter, className: 'text-textSecondary' },
    { 
      header: 'Status', 
      accessor: (row: CostCenter) => (
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
    setFormData({ branch_id: '', code: '', name: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: CostCenter) => {
    setEditingItem(row);
    setFormData({ 
      branch_id: row.branch_id,
      code: row.code, 
      name: row.name, 
      is_active: row.is_active 
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: CostCenter) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        await organizationApi.updateCostCenter(editingItem.id, formData);
        addToast('success', 'Success', 'Cost Center updated successfully.');
      } else {
        await organizationApi.createCostCenter(formData);
        addToast('success', 'Success', 'Cost Center created successfully.');
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {
      console.error('Failed to save cost center:', error);
      const errMsg = error.response?.data?.detail || 'Failed to save cost center.';
      addToast('error', 'Error', typeof errMsg === 'string' ? errMsg : 'Validation error.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await organizationApi.deleteCostCenter(editingItem.id).catch(() => {
           return organizationApi.updateCostCenter(editingItem.id, { is_active: false });
        });
        addToast('success', 'Success', 'Cost Center deleted.');
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Error', 'Failed to delete cost center.');
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
          <h1 className="text-2xl font-bold text-textPrimary">Cost Centers</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Organization</span>
            <span>/</span>
            <span className="text-primary font-medium">Cost Center</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Cost Center Directory"
          description="Manage financial cost centers linked to branches."
          columns={columns}
          data={costCenters}
          searchPlaceholder="Search cost center by name or code..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Form Modal */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        title={editingItem ? "Edit Cost Center" : "Add New Cost Center"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Branch <span className="text-danger">*</span></label>
            <select 
              required
              value={formData.branch_id}
              onChange={e => setFormData({...formData, branch_id: e.target.value})}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
            >
              <option value="" disabled>Select Branch...</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Cost Center Code <span className="text-danger">*</span></label>
              <input 
                required
                type="text" 
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
                placeholder="e.g. CC-JKT-01"
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
            <label className="text-sm font-medium text-textPrimary">Cost Center Name <span className="text-danger">*</span></label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
              placeholder="e.g. Engineering Dept"
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
              Save Cost Center
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
