import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Package, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Material {
  id: string;
  code: string;
  name: string;
  category?: string;
  uom: string;
  min_stock: number;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

const MATERIAL_CATEGORIES = [
  'Mud / Chemical', 'Drilling Bits', 'Consumables', 'Fuel', 'Lubricant',
  'Spare Parts', 'Pipes & Casing', 'Safety Items', 'Laboratory Chemicals', 'Other'
];

const UOM_OPTIONS = ['pcs', 'kg', 'liter', 'bag', 'box', 'roll', 'meter', 'set', 'drum', 'ton'];

export function MaterialPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Material | null>(null);

  const [formData, setFormData] = useState<Omit<Material, 'id' | 'created_at'>>({
    code: '', name: '', category: '', uom: 'pcs', min_stock: 0, description: '', is_active: true,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await inventoryApi.getMaterials();
      const sorted = res.data.sort((a: Material, b: Material) => a.code.localeCompare(b.code));
      setMaterials(sorted);
    } catch (error) {
      addToast('error', 'Connection Error', 'Failed to fetch material data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const isNew = (dateStr?: string) => {
    if (!dateStr) return false;
    return (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60) <= 24;
  };

  const columns = [
    { header: 'Code', accessor: 'code' as keyof Material, className: 'font-mono text-primary w-24' },
    {
      header: 'Material',
      accessor: (row: Material) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{row.name}</span>
            {isNew(row.created_at) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse whitespace-nowrap">
                <Sparkles className="w-3 h-3" /> New
              </span>
            )}
          </div>
          <span className="text-xs text-textSecondary">{row.description || row.category || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: (row: Material) => (
        <span className="px-2 py-0.5 rounded bg-secondary/20 text-textPrimary text-xs font-medium">{row.category || '-'}</span>
      ),
    },
    {
      header: 'UOM',
      accessor: (row: Material) => (
        <span className="text-sm text-textPrimary font-medium">{row.uom}</span>
      ),
      className: 'w-20',
    },
    {
      header: 'Min. Stock',
      accessor: (row: Material) => (
        <span className="text-sm text-textPrimary font-mono">{row.min_stock} <span className="text-textSecondary text-xs">{row.uom}</span></span>
      ),
      className: 'w-28',
    },
    {
      header: 'Status',
      accessor: (row: Material) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      className: 'w-24',
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', category: '', uom: 'pcs', min_stock: 0, description: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: Material) => {
    setEditingItem(row);
    setFormData({ code: row.code, name: row.name, category: row.category || '', uom: row.uom, min_stock: row.min_stock, description: row.description || '', is_active: row.is_active });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Material) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        await inventoryApi.updateMaterial(editingItem.id, formData);
        addToast('success', 'Material Updated', `${formData.code} has been updated.`);
      } else {
        await inventoryApi.createMaterial(formData);
        addToast('success', 'Material Created', `${formData.code} has been registered.`);
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
        await inventoryApi.deleteMaterial(editingItem.id);
        addToast('success', 'Material Deleted', `${editingItem.code} has been removed.`);
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
    return <div className="flex items-center justify-center h-[calc(100vh-120px)]"><div className="text-textSecondary animate-pulse">Loading material data...</div></div>;
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/master-data" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Material</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Asset & Inventory</span>
            <span>/</span>
            <span className="text-primary font-medium">Material</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Material Master"
          description="Define raw materials, consumables, and supplies including unit of measurement and minimum stock levels."
          columns={columns}
          data={materials}
          searchPlaceholder="Search material by code, name, or category..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? 'Edit Material' : 'Register New Material'} maxWidth="max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg border border-secondary/20">
            <div className="p-2 bg-secondary/20 rounded-md"><Package className="w-4 h-4 text-primary" /></div>
            <p className="text-xs text-textSecondary">Materials define items that can be stored and tracked in warehouse inventory.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Material Code <span className="text-danger">*</span></label>
              <input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. MAT-001" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Status</label>
              <select value={formData.is_active ? 'Active' : 'Inactive'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'Active' })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textPrimary">Material Name <span className="text-danger">*</span></label>
            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Bentonite Powder" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Category</label>
              <select value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="">Select Category...</option>
                {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Unit of Measurement <span className="text-danger">*</span></label>
              <select required value={formData.uom} onChange={e => setFormData({ ...formData, uom: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textPrimary">Minimum Stock Level</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" min="0" value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="0" />
              <span className="text-sm text-textSecondary font-medium w-12 text-center">{formData.uom}</span>
            </div>
            <p className="text-[10px] text-textSecondary">Alert threshold for low-stock notification.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textPrimary">Description</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary resize-none" placeholder="Additional notes about this material..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Material'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete <span className="font-bold text-textPrimary">{editingItem?.name}</span>. Materials with active inventory entries cannot be deleted.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
