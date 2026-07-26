import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Warehouse, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryApi, organizationApi, hrApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  address?: string;
  manager_id?: string;
  branch_id?: string;
  is_active: boolean;
  created_at?: string;
  manager?: { name: string; code: string };
  branch?: { name: string; code: string };
}

export function WarehousePage() {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);

  const [formData, setFormData] = useState<Omit<WarehouseItem, 'id' | 'created_at' | 'manager' | 'branch'>>({
    code: '', name: '', address: '', manager_id: '', branch_id: '', is_active: true,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [wRes, bRes, eRes] = await Promise.all([
        inventoryApi.getWarehouses(),
        organizationApi.getBranches(),
        hrApi.getEmployees(),
      ]);
      setBranches(bRes.data);
      setEmployees(eRes.data);
      const sorted = wRes.data.sort((a: WarehouseItem, b: WarehouseItem) => a.code.localeCompare(b.code));
      setWarehouses(sorted);
    } catch (error) {
      addToast('error', 'Connection Error', 'Failed to fetch warehouse data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const isNew = (dateStr?: string) => {
    if (!dateStr) return false;
    const diff = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
    return diff <= 24;
  };

  const columns = [
    { header: 'Code', accessor: 'code' as keyof WarehouseItem, className: 'font-mono text-primary w-24' },
    {
      header: 'Warehouse Name',
      accessor: (row: WarehouseItem) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{row.name}</span>
            {isNew(row.created_at) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse whitespace-nowrap">
                <Sparkles className="w-3 h-3" /> New
              </span>
            )}
          </div>
          <span className="text-xs text-textSecondary">{row.address || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Branch',
      accessor: (row: WarehouseItem) => (
        <span className="text-sm text-textPrimary">{row.branch ? `${row.branch.code} - ${row.branch.name}` : '-'}</span>
      ),
    },
    {
      header: 'Manager',
      accessor: (row: WarehouseItem) => (
        <span className="text-sm text-textPrimary">{row.manager ? row.manager.name : '-'}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: WarehouseItem) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      className: 'w-24',
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', address: '', manager_id: '', branch_id: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: WarehouseItem) => {
    setEditingItem(row);
    setFormData({ code: row.code, name: row.name, address: row.address || '', manager_id: row.manager_id || '', branch_id: row.branch_id || '', is_active: row.is_active });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: WarehouseItem) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { ...formData, manager_id: formData.manager_id || null, branch_id: formData.branch_id || null };
    try {
      if (editingItem) {
        await inventoryApi.updateWarehouse(editingItem.id, payload);
        addToast('success', 'Warehouse Updated', `${formData.code} has been updated.`);
      } else {
        await inventoryApi.createWarehouse(payload);
        addToast('success', 'Warehouse Created', `${formData.code} has been created.`);
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {
      const errMsg = error.response?.data?.detail || 'Failed to save.';
      addToast('error', 'Save Failed', typeof errMsg === 'string' ? errMsg : 'Validation error.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await inventoryApi.deleteWarehouse(editingItem.id);
        addToast('success', 'Warehouse Deleted', `${editingItem.code} has been removed.`);
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error: any) {
        const errMsg = error.response?.data?.detail || 'Could not delete.';
        addToast('error', 'Delete Failed', errMsg);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-120px)]"><div className="text-textSecondary animate-pulse">Loading warehouse data...</div></div>;
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/master-data" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Warehouse</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Asset & Inventory</span>
            <span>/</span>
            <span className="text-primary font-medium">Warehouse</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Warehouse Registry"
          description="Manage storage locations, branch assignments, and warehouse managers."
          columns={columns}
          data={warehouses}
          searchPlaceholder="Search warehouse by code or name..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? 'Edit Warehouse' : 'Add New Warehouse'} maxWidth="max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg border border-secondary/20">
            <div className="p-2 bg-secondary/20 rounded-md"><Warehouse className="w-4 h-4 text-primary" /></div>
            <p className="text-xs text-textSecondary">A warehouse is a physical storage location for materials and equipment.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Warehouse Code <span className="text-danger">*</span></label>
              <input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. WH-001" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Status <span className="text-danger">*</span></label>
              <select value={formData.is_active ? 'Active' : 'Inactive'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'Active' })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textPrimary">Warehouse Name <span className="text-danger">*</span></label>
            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Main Warehouse Jakarta" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textPrimary">Address</label>
            <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary resize-none" placeholder="Full warehouse address..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Branch Office</label>
              <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="">Select Branch...</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Warehouse Manager</label>
              <select value={formData.manager_id} onChange={e => setFormData({ ...formData, manager_id: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="">Select Manager...</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.code} - {emp.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Warehouse'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete <span className="font-bold text-textPrimary">{editingItem?.name}</span>. Warehouses with active stock or equipment cannot be deleted.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
