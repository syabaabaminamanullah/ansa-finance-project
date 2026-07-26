import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Box, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface InventoryItem {
  id: string;
  material_id: string;
  warehouse_id: string;
  quantity: number;
  unit_cost: number;
  is_active: boolean;
  created_at?: string;
  material?: { name: string; code: string; uom: string; min_stock: number };
  warehouse?: { name: string; code: string };
}

export function InventoryItemPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState<Omit<InventoryItem, 'id' | 'created_at' | 'material' | 'warehouse'>>({
    material_id: '', warehouse_id: '', quantity: 0, unit_cost: 0, is_active: true,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [iRes, mRes, wRes] = await Promise.all([
        inventoryApi.getInventoryItems(),
        inventoryApi.getMaterials(),
        inventoryApi.getWarehouses(),
      ]);
      setMaterials(mRes.data);
      setWarehouses(wRes.data);
      const sorted = iRes.data.sort((a: InventoryItem, b: InventoryItem) =>
        (a.material?.code || '').localeCompare(b.material?.code || '')
      );
      setItems(sorted);
    } catch (error) {
      addToast('error', 'Connection Error', 'Failed to fetch inventory data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const isLowStock = (item: InventoryItem) => {
    if (!item.material) return false;
    return item.quantity <= item.material.min_stock && item.material.min_stock > 0;
  };

  const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.unit_cost), 0);
  const lowStockCount = items.filter(isLowStock).length;

  const columns = [
    {
      header: 'Material',
      accessor: (row: InventoryItem) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-textPrimary">{row.material?.name || '-'}</span>
            {isLowStock(row) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-bold border border-warning/20 animate-pulse whitespace-nowrap">
                <TrendingDown className="w-3 h-3" /> Low Stock
              </span>
            )}
          </div>
          <span className="text-xs text-textSecondary font-mono">{row.material?.code || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Warehouse',
      accessor: (row: InventoryItem) => (
        <div className="flex flex-col text-xs space-y-0.5">
          <span className="text-textPrimary font-medium">{row.warehouse?.name || '-'}</span>
          <span className="text-textSecondary">{row.warehouse?.code || ''}</span>
        </div>
      ),
    },
    {
      header: 'Quantity',
      accessor: (row: InventoryItem) => (
        <div className="flex flex-col">
          <span className="font-bold text-textPrimary font-mono">{row.quantity.toLocaleString()} <span className="text-textSecondary font-normal text-xs">{row.material?.uom || ''}</span></span>
          {row.material && row.material.min_stock > 0 && (
            <span className="text-[10px] text-textSecondary">Min: {row.material.min_stock} {row.material.uom}</span>
          )}
        </div>
      ),
      className: 'w-32',
    },
    {
      header: 'Unit Cost (IDR)',
      accessor: (row: InventoryItem) => (
        <span className="text-sm text-textPrimary font-mono">{row.unit_cost.toLocaleString('id-ID')}</span>
      ),
      className: 'w-36',
    },
    {
      header: 'Total Value',
      accessor: (row: InventoryItem) => (
        <span className="text-sm font-semibold text-primary font-mono">{(row.quantity * row.unit_cost).toLocaleString('id-ID')}</span>
      ),
      className: 'w-36',
    },
    {
      header: 'Status',
      accessor: (row: InventoryItem) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      className: 'w-24',
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ material_id: '', warehouse_id: '', quantity: 0, unit_cost: 0, is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: InventoryItem) => {
    setEditingItem(row);
    setFormData({ material_id: row.material_id, warehouse_id: row.warehouse_id, quantity: row.quantity, unit_cost: row.unit_cost, is_active: row.is_active });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: InventoryItem) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingItem) {
        await inventoryApi.updateInventoryItem(editingItem.id, formData);
        addToast('success', 'Stock Updated', 'Inventory entry has been updated.');
      } else {
        await inventoryApi.createInventoryItem(formData);
        addToast('success', 'Stock Registered', 'New inventory entry has been created.');
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
        await inventoryApi.deleteInventoryItem(editingItem.id);
        addToast('success', 'Entry Deleted', 'Inventory entry has been removed.');
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

  const selectedMaterial = materials.find(m => m.id === formData.material_id);

  if (isLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-120px)]"><div className="text-textSecondary animate-pulse">Loading inventory data...</div></div>;
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/master-data" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-textPrimary">Inventory Stock</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Asset & Inventory</span>
            <span>/</span>
            <span className="text-primary font-medium">Inventory Item</span>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-card border border-border rounded-lg text-right">
            <p className="text-xs text-textSecondary">Total Items</p>
            <p className="text-lg font-bold text-textPrimary">{items.length}</p>
          </div>
          <div className="px-4 py-2 bg-card border border-border rounded-lg text-right">
            <p className="text-xs text-textSecondary">Portfolio Value</p>
            <p className="text-lg font-bold text-primary font-mono">IDR {totalValue.toLocaleString('id-ID')}</p>
          </div>
          {lowStockCount > 0 && (
            <div className="px-4 py-2 bg-warning/5 border border-warning/20 rounded-lg text-right">
              <p className="text-xs text-warning">Low Stock Alert</p>
              <p className="text-lg font-bold text-warning">{lowStockCount} items</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Inventory Stock Ledger"
          description="Track material stock levels per warehouse, unit costs, and total portfolio values."
          columns={columns}
          data={items}
          searchPlaceholder="Search by material name or warehouse..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? 'Edit Inventory Entry' : 'Register Stock Entry'} maxWidth="max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg border border-secondary/20">
            <div className="p-2 bg-secondary/20 rounded-md"><Box className="w-4 h-4 text-primary" /></div>
            <p className="text-xs text-textSecondary">An inventory entry maps a specific material to a warehouse with current quantity and unit cost.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textPrimary">Material <span className="text-danger">*</span></label>
            <select required value={formData.material_id} onChange={e => setFormData({ ...formData, material_id: e.target.value })} disabled={!!editingItem} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary disabled:opacity-60 disabled:cursor-not-allowed">
              <option value="">Select Material...</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name} ({m.uom})</option>)}
            </select>
            {editingItem && <p className="text-[10px] text-textSecondary">Material cannot be changed. Create a new entry to track different materials.</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textPrimary">Warehouse <span className="text-danger">*</span></label>
            <select required value={formData.warehouse_id} onChange={e => setFormData({ ...formData, warehouse_id: e.target.value })} disabled={!!editingItem} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary disabled:opacity-60 disabled:cursor-not-allowed">
              <option value="">Select Warehouse...</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Quantity <span className="text-danger">*</span></label>
              <div className="flex items-center gap-2">
                <input required type="number" step="0.01" min="0" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" />
                <span className="text-sm text-textSecondary font-medium w-10 text-center">{selectedMaterial?.uom || '-'}</span>
              </div>
              {selectedMaterial && selectedMaterial.min_stock > 0 && (
                <p className="text-[10px] text-textSecondary">Min stock: {selectedMaterial.min_stock} {selectedMaterial.uom}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-textPrimary">Unit Cost (IDR)</label>
              <input type="number" step="1" min="0" value={formData.unit_cost} onChange={e => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="0" />
            </div>
          </div>

          {formData.quantity > 0 && formData.unit_cost > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
              <span className="text-xs text-textSecondary">Total Stock Value</span>
              <span className="text-sm font-bold text-primary font-mono">IDR {(formData.quantity * formData.unit_cost).toLocaleString('id-ID')}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-textPrimary">Status</label>
            <select value={formData.is_active ? 'Active' : 'Inactive'} onChange={e => setFormData({ ...formData, is_active: e.target.value === 'Active' })} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Stock Entry'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3>
            <p className="text-sm text-textSecondary mt-1">You are about to remove the inventory entry for <span className="font-bold text-textPrimary">{editingItem?.material?.name}</span> at <span className="font-bold text-textPrimary">{editingItem?.warehouse?.name}</span>.</p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
