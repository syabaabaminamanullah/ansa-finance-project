import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Wrench, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Equipment {
  id: string;
  code: string;
  name: string;
  category?: string;
  serial_number?: string;
  brand?: string;
  purchase_date?: string;
  status?: string;
  warehouse_id?: string;
  is_active: boolean;
  created_at?: string;
  warehouse?: { name: string; code: string };
}

const EQUIPMENT_CATEGORIES = ['Water Pump', 'Generator', 'SPT Hammer', 'Test Kit', 'Compressor', 'Drilling Motor', 'Vehicle', 'Safety Equipment', 'Other'];
const EQUIPMENT_STATUSES = ['Active', 'Repair', 'In Use', 'Scrapped'];

export function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);

  const [formData, setFormData] = useState<Omit<Equipment, 'id' | 'created_at' | 'warehouse'>>({
    code: '', name: '', category: '', serial_number: '', brand: '',
    purchase_date: '', status: 'Active', warehouse_id: '', is_active: true,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [eRes, wRes] = await Promise.all([
        inventoryApi.getEquipments(),
        inventoryApi.getWarehouses(),
      ]);
      setWarehouses(wRes.data);
      const sorted = eRes.data.sort((a: Equipment, b: Equipment) => a.code.localeCompare(b.code));
      setEquipments(sorted);
    } catch (error) {
      addToast('error', 'Connection Error', 'Failed to fetch equipment data.');
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
    Repair: 'bg-warning/10 text-warning',
    'In Use': 'bg-primary/10 text-primary',
    Scrapped: 'bg-danger/10 text-danger',
  };

  const columns = [
    { header: 'Code', accessor: 'code' as keyof Equipment, className: 'font-mono text-primary w-24' },
    {
      header: 'Equipment',
      accessor: (row: Equipment) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{row.name}</span>
            {isNew(row.created_at) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse whitespace-nowrap">
                <Sparkles className="w-3 h-3" /> New
              </span>
            )}
          </div>
          <span className="text-xs text-textSecondary">{row.brand ? `${row.brand} • ` : ''}{row.category || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Serial / Purchase',
      accessor: (row: Equipment) => (
        <div className="flex flex-col text-xs space-y-0.5">
          <span className="text-textPrimary font-medium font-mono">{row.serial_number || '-'}</span>
          <span className="text-textSecondary">{row.purchase_date || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Location',
      accessor: (row: Equipment) => (
        <span className="text-sm text-textPrimary">{row.warehouse ? `${row.warehouse.code} - ${row.warehouse.name}` : '-'}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Equipment) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[row.status || ''] || 'bg-secondary/10 text-textSecondary'}`}>
          {row.status || '-'}
        </span>
      ),
      className: 'w-24',
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', category: '', serial_number: '', brand: '', purchase_date: '', status: 'Active', warehouse_id: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: Equipment) => {
    setEditingItem(row);
    setFormData({ code: row.code, name: row.name, category: row.category || '', serial_number: row.serial_number || '', brand: row.brand || '', purchase_date: row.purchase_date || '', status: row.status || 'Active', warehouse_id: row.warehouse_id || '', is_active: row.is_active });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Equipment) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { ...formData, warehouse_id: formData.warehouse_id || null };
    try {
      if (editingItem) {
        await inventoryApi.updateEquipment(editingItem.id, payload);
        addToast('success', 'Equipment Updated', `${formData.code} has been updated.`);
      } else {
        await inventoryApi.createEquipment(payload);
        addToast('success', 'Equipment Created', `${formData.code} has been registered.`);
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
        await inventoryApi.deleteEquipment(editingItem.id);
        addToast('success', 'Equipment Deleted', `${editingItem.code} has been removed.`);
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
    return <div className="flex items-center justify-center h-[calc(100vh-120px)]"><div className="text-textSecondary animate-pulse">Loading equipment data...</div></div>;
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/master-data" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Equipment</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Asset & Inventory</span>
            <span>/</span>
            <span className="text-primary font-medium">Equipment</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Equipment Registry"
          description="Track tools, machines, and field equipment including brand, serial number, and storage location."
          columns={columns}
          data={equipments}
          searchPlaceholder="Search equipment by code, name, or category..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? 'Edit Equipment' : 'Register New Equipment'} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-6">
            {/* Left */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2 flex items-center gap-2"><Wrench className="w-4 h-4" /> Equipment Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Equip. Code <span className="text-danger">*</span></label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. EQP-001" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                    {EQUIPMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Equipment Name <span className="text-danger">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Submersible Water Pump" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Category</label>
                <select value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Select Category...</option>
                  {EQUIPMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Brand / Manufacturer</label>
                <input type="text" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Grundfos, Caterpillar" />
              </div>
            </div>

            {/* Right */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2">Technical & Location</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Serial Number</label>
                <input type="text" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="Manufacturer serial no." />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Purchase Date</label>
                <input type="date" value={formData.purchase_date} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Stored at Warehouse</label>
                <select value={formData.warehouse_id} onChange={e => setFormData({ ...formData, warehouse_id: e.target.value })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Select Warehouse...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
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
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Equipment'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete equipment <span className="font-bold text-textPrimary">{editingItem?.name}</span>. This action cannot be undone.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
