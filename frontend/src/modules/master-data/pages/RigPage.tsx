import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Truck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryApi, organizationApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Rig {
  id: string;
  code: string;
  name: string;
  model_type?: string;
  capacity_depth?: number;
  serial_number?: string;
  ownership_status?: string;
  status?: string;
  branch_id?: string;
  is_active: boolean;
  created_at?: string;
  branch?: { name: string; code: string };
}

const MODEL_TYPES = ['Spindle', 'Crawler', 'Jack-up', 'Rotary', 'Diamond Core', 'Other'];
const OWNERSHIP_STATUSES = ['Owned', 'Rented', 'Leased'];
const RIG_STATUSES = ['Active', 'Maintenance', 'Idle', 'Inactive'];

export function RigPage() {
  const [rigs, setRigs] = useState<Rig[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Rig | null>(null);

  const [formData, setFormData] = useState<Omit<Rig, 'id' | 'created_at' | 'branch'>>({
    code: '', name: '', model_type: '', capacity_depth: undefined, serial_number: '',
    ownership_status: '', status: 'Active', branch_id: '', is_active: true,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [rRes, bRes] = await Promise.all([
        inventoryApi.getRigs(),
        organizationApi.getBranches(),
      ]);
      setBranches(bRes.data);
      const sorted = rRes.data.sort((a: Rig, b: Rig) => a.code.localeCompare(b.code));
      setRigs(sorted);
    } catch (error) {
      addToast('error', 'Connection Error', 'Failed to fetch rig data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const isNew = (dateStr?: string) => {
    if (!dateStr) return false;
    return (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60) <= 24;
  };

  const statusColors: Record<string, string> = {
    Active: 'bg-success/10 text-success',
    Maintenance: 'bg-warning/10 text-warning',
    Idle: 'bg-secondary/20 text-textSecondary',
    Inactive: 'bg-danger/10 text-danger',
  };

  const columns = [
    { header: 'Rig Code', accessor: 'code' as keyof Rig, className: 'font-mono text-primary w-24' },
    {
      header: 'Rig Details',
      accessor: (row: Rig) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{row.name}</span>
            {isNew(row.created_at) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse whitespace-nowrap">
                <Sparkles className="w-3 h-3" /> New
              </span>
            )}
          </div>
          <span className="text-xs text-textSecondary">{row.model_type || '-'} {row.capacity_depth ? `| ${row.capacity_depth}m depth` : ''}</span>
        </div>
      ),
    },
    {
      header: 'Ownership',
      accessor: (row: Rig) => (
        <div className="flex flex-col text-xs space-y-0.5">
          <span className="text-textPrimary font-medium">{row.ownership_status || '-'}</span>
          <span className="text-textSecondary">S/N: {row.serial_number || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Branch',
      accessor: (row: Rig) => (
        <span className="text-sm text-textPrimary">{row.branch ? `${row.branch.code} - ${row.branch.name}` : '-'}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Rig) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[row.status || ''] || 'bg-secondary/10 text-textSecondary'}`}>
          {row.status || '-'}
        </span>
      ),
      className: 'w-28',
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', model_type: '', capacity_depth: undefined, serial_number: '', ownership_status: '', status: 'Active', branch_id: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: Rig) => {
    setEditingItem(row);
    setFormData({ code: row.code, name: row.name, model_type: row.model_type || '', capacity_depth: row.capacity_depth, serial_number: row.serial_number || '', ownership_status: row.ownership_status || '', status: row.status || 'Active', branch_id: row.branch_id || '', is_active: row.is_active });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Rig) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { ...formData, branch_id: formData.branch_id || null };
    try {
      if (editingItem) {
        await inventoryApi.updateRig(editingItem.id, payload);
        addToast('success', 'Rig Updated', `${formData.code} has been updated.`);
      } else {
        await inventoryApi.createRig(payload);
        addToast('success', 'Rig Created', `${formData.code} has been created.`);
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
        await inventoryApi.deleteRig(editingItem.id);
        addToast('success', 'Rig Deleted', `${editingItem.code} has been removed.`);
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
    return <div className="flex items-center justify-center h-[calc(100vh-120px)]"><div className="text-textSecondary animate-pulse">Loading rig data...</div></div>;
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/master-data" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Drilling Rigs</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Asset & Inventory</span>
            <span>/</span>
            <span className="text-primary font-medium">Rig</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Rig Fleet Registry"
          description="Manage drilling rigs, types, capacity, ownership status, and branch deployment."
          columns={columns}
          data={rigs}
          searchPlaceholder="Search rig by code, name, or type..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? 'Edit Rig' : 'Add New Rig'} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: General */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2 flex items-center gap-2"><Truck className="w-4 h-4" /> Rig Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Rig Code <span className="text-danger">*</span></label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. RIG-001" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Op. Status <span className="text-danger">*</span></label>
                  <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                    {RIG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Rig Name <span className="text-danger">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Rig Alpha 1" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Model / Type</label>
                <select value={formData.model_type || ''} onChange={e => setFormData({ ...formData, model_type: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Select Model...</option>
                  {MODEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Max Drilling Depth (m)</label>
                <input type="number" step="0.1" min="0" value={formData.capacity_depth ?? ''} onChange={e => setFormData({ ...formData, capacity_depth: e.target.value ? parseFloat(e.target.value) : undefined })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. 300" />
              </div>
            </div>

            {/* Right: Technical */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2">Technical & Deployment</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Serial Number</label>
                <input type="text" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="Manufacturer serial no." />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Ownership Status</label>
                <select value={formData.ownership_status || ''} onChange={e => setFormData({ ...formData, ownership_status: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Select...</option>
                  {OWNERSHIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Assigned Branch</label>
                <select value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Select Branch...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Active Record</label>
                <select value={formData.is_active ? 'Active' : 'Inactive'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'Active' })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Rig'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete rig <span className="font-bold text-textPrimary">{editingItem?.name}</span>. This action cannot be undone.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
