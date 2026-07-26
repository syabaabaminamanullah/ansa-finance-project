import React, { useState, useEffect } from 'react';
import { assetsApi, inventoryApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import { DataTable } from '../../../components/ui/DataTable';
import { Play, Plus, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AssetManagementPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [rigs, setRigs] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDepreciating, setIsDepreciating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    asset_number: '',
    name: '',
    asset_type: 'Equipment',
    purchase_date: '',
    purchase_price: 0,
    salvage_value: 0,
    useful_life_years: 0,
    linked_rig_id: '',
    linked_equipment_id: ''
  });

  const addToast = useToastStore((state) => state.addToast);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [assetsRes, rigsRes, eqRes] = await Promise.all([
        assetsApi.getFixedAssets(),
        inventoryApi.getRigs(),
        inventoryApi.getEquipments()
      ]);
      setAssets(assetsRes.data);
      setRigs(rigsRes.data);
      setEquipments(eqRes.data);
    } catch (error) {
      console.error(error);
      addToast('error', 'Error', 'Failed to fetch asset data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRunDepreciation = async () => {
    if (!window.confirm('Are you sure you want to run the monthly depreciation engine? This will generate journals automatically.')) return;
    try {
      setIsDepreciating(true);
      const res = await assetsApi.runDepreciation();
      if (res.data.total_depreciated > 0) {
        addToast('success', 'Success', `Depreciation ran successfully! Total depreciated: Rp ${res.data.total_depreciated.toLocaleString()}`);
      } else {
        addToast('info', 'Info', 'No assets required depreciation this month.');
      }
      fetchAllData();
    } catch (error) {
      console.error(error);
      addToast('error', 'Error', 'Failed to run depreciation');
    } finally {
      setIsDepreciating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const payload = { ...formData };
      if (payload.asset_type === 'Equipment') {
        payload.linked_rig_id = '';
      } else {
        payload.linked_equipment_id = '';
      }

      await assetsApi.createFixedAsset(payload);
      addToast('success', 'Success', 'Fixed Asset created successfully');
      setIsModalOpen(false);
      setFormData({
        asset_number: '',
        name: '',
        asset_type: 'Equipment',
        purchase_date: '',
        purchase_price: 0,
        salvage_value: 0,
        useful_life_years: 0,
        linked_rig_id: '',
        linked_equipment_id: ''
      });
      fetchAllData();
    } catch (error: any) {
      console.error(error);
      addToast('error', 'Error', error.response?.data?.detail || 'Failed to create asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: 'Asset No', accessor: 'asset_number' as keyof any },
    { header: 'Name', accessor: 'name' as keyof any },
    { header: 'Type', accessor: 'asset_type' as keyof any },
    { header: 'Purchase Date', accessor: 'purchase_date' as keyof any },
    { 
      header: 'Purchase Price', 
      accessor: 'purchase_price' as keyof any,
      render: (val: number) => `Rp ${val.toLocaleString()}`
    },
    { 
      header: 'Book Value', 
      accessor: 'book_value' as keyof any,
      render: (val: number) => `Rp ${val.toLocaleString()}`
    },
    { 
      header: 'Accum. Dep.', 
      accessor: 'accumulated_depreciation' as keyof any,
      render: (val: number) => `Rp ${val.toLocaleString()}`
    },
    { 
      header: 'Status', 
      accessor: 'status' as keyof any,
      render: (val: string) => (
        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-primary/10 text-primary">
          {val}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link 
            to="/assets"
            className="p-2 bg-card border border-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">Fixed Asset List</h1>
            <p className="text-textSecondary mt-1">Manage master data and register new fixed assets</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRunDepreciation}
            disabled={isDepreciating}
            className="flex items-center space-x-2 bg-secondary text-textPrimary px-4 py-2 rounded-lg hover:bg-secondary/80 disabled:opacity-50 transition-colors font-medium border border-border"
          >
            <Play size={18} className="text-warning" />
            <span>{isDepreciating ? 'Running...' : 'Run Monthly Depreciation'}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            <Plus size={18} />
            <span>Add New Asset</span>
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <DataTable
          columns={columns}
          data={assets}
          isLoading={isLoading}
          searchable
          searchField="name"
        />
      </div>

      {/* Add Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold text-textPrimary">Add New Fixed Asset</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-textSecondary hover:text-textPrimary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="assetForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Asset Number *</label>
                    <input
                      required
                      type="text"
                      value={formData.asset_number}
                      onChange={(e) => setFormData({...formData, asset_number: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. FA-001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Asset Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. Komatsu Excavator"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Asset Type</label>
                    <select
                      value={formData.asset_type}
                      onChange={(e) => setFormData({...formData, asset_type: e.target.value, linked_equipment_id: '', linked_rig_id: ''})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="Equipment">Equipment</option>
                      <option value="Rig">Rig</option>
                      <option value="Vehicle">Vehicle</option>
                      <option value="Building">Building / Facility</option>
                    </select>
                  </div>
                  
                  {formData.asset_type === 'Equipment' && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">Link to Operational Equipment</label>
                      <select
                        value={formData.linked_equipment_id}
                        onChange={(e) => setFormData({...formData, linked_equipment_id: e.target.value})}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">-- No Link --</option>
                        {equipments.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.code} - {eq.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.asset_type === 'Rig' && (
                    <div>
                      <label className="block text-sm font-medium text-textSecondary mb-1">Link to Operational Rig</label>
                      <select
                        value={formData.linked_rig_id}
                        onChange={(e) => setFormData({...formData, linked_rig_id: e.target.value})}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="">-- No Link --</option>
                        {rigs.map(rig => (
                          <option key={rig.id} value={rig.id}>{rig.code} - {rig.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Useful Life (Years) *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.useful_life_years}
                      onChange={(e) => setFormData({...formData, useful_life_years: parseInt(e.target.value) || 0})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border mt-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Purchase Price (Rp) *</label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={formData.purchase_price}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData({...formData, purchase_price: val, book_value: val});
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Salvage Value (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.salvage_value}
                      onChange={(e) => setFormData({...formData, salvage_value: parseFloat(e.target.value) || 0})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Estimated value at end of life"
                    />
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-secondary/10 rounded-b-xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-textSecondary font-medium hover:text-textPrimary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="assetForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Fixed Asset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
