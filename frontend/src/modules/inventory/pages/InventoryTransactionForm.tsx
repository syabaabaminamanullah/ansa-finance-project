import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { inventoryTransactionApi, inventoryApi, projectsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

export function InventoryTransactionForm() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'RECEIPT',
    source_warehouse_id: '',
    destination_warehouse_id: '',
    project_id: '',
    reference_number: '',
    notes: '',
  });

  const [lines, setLines] = useState([
    { material_id: '', quantity: 0, unit_cost: 0 }
  ]);

  useEffect(() => {
    fetchLookups();
  }, []);

  const fetchLookups = async () => {
    try {
      const [wRes, mRes, pRes] = await Promise.all([
        inventoryApi.getWarehouses(),
        inventoryApi.getMaterials(),
        projectsApi.getProjects()
      ]);
      setWarehouses(wRes.data);
      setMaterials(mRes.data);
      setProjects(pRes.data);
    } catch (error) {
      console.error('Failed to fetch lookups', error);
    }
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lines.some(l => !l.material_id || l.quantity <= 0)) {
      addToast('error', 'Validation Error', 'All lines must have a material and quantity > 0');
      return;
    }

    if (formData.type === 'TRANSFER' && formData.source_warehouse_id === formData.destination_warehouse_id) {
      addToast('error', 'Validation Error', 'Source and destination warehouse cannot be the same');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        lines
      };
      
      const res = await inventoryTransactionApi.createTransaction(payload);
      
      // Auto post for simplicity in this demo
      await inventoryTransactionApi.postTransaction(res.data.id);
      
      addToast('success', 'Success', 'Transaction created and posted successfully');
      navigate('/inventory/transactions');
    } catch (error: any) {
      addToast('error', 'Error', error.response?.data?.detail || 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/inventory/transactions')}
          className="p-2 bg-card border border-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">New Transaction</h1>
          <p className="text-textSecondary mt-1">Record goods receipt, issuance, or transfer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value, source_warehouse_id: '', destination_warehouse_id: '', project_id: '' }))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="RECEIPT">Goods Receipt (In)</option>
                <option value="ISSUE">Goods Issue (Out)</option>
                <option value="TRANSFER">Warehouse Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Reference Number</label>
              <input
                type="text"
                placeholder="e.g. PO-2026-001"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {['ISSUE', 'TRANSFER'].includes(formData.type) && (
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">Source Warehouse</label>
                <select
                  required
                  value={formData.source_warehouse_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, source_warehouse_id: e.target.value }))}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}

            {['RECEIPT', 'TRANSFER'].includes(formData.type) && (
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">Destination Warehouse</label>
                <select
                  required
                  value={formData.destination_warehouse_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, destination_warehouse_id: e.target.value }))}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}

            {formData.type === 'ISSUE' && (
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-2">Assign to Project (Optional)</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-textPrimary">Transaction Lines</h2>
            <button
              type="button"
              onClick={() => setLines([...lines, { material_id: '', quantity: 0, unit_cost: 0 }])}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-textSecondary uppercase bg-secondary/30">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-l-lg w-1/2">Material</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  {formData.type === 'RECEIPT' && <th className="px-4 py-3 font-medium">Unit Cost (Rp)</th>}
                  <th className="px-4 py-3 font-medium rounded-r-lg w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <select
                        required
                        value={line.material_id}
                        onChange={(e) => handleLineChange(index, 'material_id', e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select Material</option>
                        {materials.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={line.quantity || ''}
                        onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value))}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </td>
                    {formData.type === 'RECEIPT' && (
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={line.unit_cost || ''}
                          onChange={(e) => handleLineChange(index, 'unit_cost', parseFloat(e.target.value))}
                          className="w-full px-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setLines(lines.filter((_, i) => i !== index))}
                        disabled={lines.length === 1}
                        className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-card rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-card/30 border-t-card rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSubmitting ? 'Posting...' : 'Save & Post Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
}
