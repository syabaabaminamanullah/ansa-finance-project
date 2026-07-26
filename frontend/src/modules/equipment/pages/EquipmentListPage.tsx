import { useState, useEffect } from 'react';
import { Wrench, Search, Plus, Filter, AlertCircle, ArrowLeft, X, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { equipmentApi, inventoryApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

export function EquipmentListPage() {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    code: `EQP-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    category: '',
    brand: '',
    serial_number: '',
    status: 'Active'
  });
  
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await equipmentApi.getEquipments();
      setEquipments(res.data);
    } catch (error) {
      console.error('Error fetching equipments:', error);
      addToast('error', 'Fetch Error', 'Failed to fetch equipment data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!newEquipment.name || !newEquipment.code) {
        addToast('warning', 'Validation', 'Please fill in required fields.');
        return;
      }
      await inventoryApi.createEquipment(newEquipment);
      addToast('success', 'Created', 'New equipment added successfully.');
      setIsModalOpen(false);
      setNewEquipment({
        code: `EQP-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        category: '',
        brand: '',
        serial_number: '',
        status: 'Active'
      });
      fetchData();
    } catch (error) {
      addToast('error', 'Creation Failed', 'Could not create equipment.');
    }
  };

  const filteredEquipments = equipments.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    if (status === 'Active') return 'bg-success/10 text-success';
    if (status === 'Dispatched') return 'bg-warning/10 text-warning';
    if (status === 'Maintenance') return 'bg-danger/10 text-danger';
    return 'bg-secondary/20 text-textSecondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link 
            to="/equipment"
            className="p-2 bg-card border border-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">Equipment List</h1>
            <p className="text-textSecondary text-sm">Manage heavy equipment, rigs, and supporting tools.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-card rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Equipment
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border text-textPrimary rounded-lg hover:bg-secondary/10 text-sm transition-colors">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 text-textSecondary text-xs uppercase border-b border-border">
                <th className="p-4 font-medium">Equipment ID</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Brand/Serial</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-textSecondary">Loading data...</td>
                </tr>
              ) : filteredEquipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-textSecondary flex flex-col items-center">
                    <AlertCircle className="w-8 h-8 text-textSecondary/50 mb-2" />
                    No equipment found.
                  </td>
                </tr>
              ) : (
                filteredEquipments.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="p-4 font-medium text-textPrimary">{item.code}</td>
                    <td className="p-4 font-semibold text-primary">{item.name}</td>
                    <td className="p-4 text-textSecondary">{item.category || 'General'}</td>
                    <td className="p-4">
                      <p className="text-textPrimary">{item.brand || '-'}</p>
                      <p className="text-xs text-textSecondary">SN: {item.serial_number || 'N/A'}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end items-center gap-2">
                        <button className="text-xs font-medium text-primary hover:underline px-2 py-1 bg-primary/10 rounded-lg">
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE EQUIPMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background">
              <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" /> Add New Equipment
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-textSecondary hover:text-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Equipment Code</label>
                  <input 
                    type="text" 
                    value={newEquipment.code} 
                    onChange={e => setNewEquipment({...newEquipment, code: e.target.value})}
                    className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Category</label>
                  <select 
                    value={newEquipment.category} 
                    onChange={e => setNewEquipment({...newEquipment, category: e.target.value})}
                    className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary"
                  >
                    <option value="">-- Select Category --</option>
                    <option value="Rig">Rig & Drilling Machine</option>
                    <option value="Water Pump">Water Pump</option>
                    <option value="Generator">Generator</option>
                    <option value="SPT Hammer">SPT Hammer</option>
                    <option value="Test Kit">Testing Kit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Equipment Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Pompa Air Honda 5HP"
                  value={newEquipment.name} 
                  onChange={e => setNewEquipment({...newEquipment, name: e.target.value})}
                  className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Brand / Make</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Honda"
                    value={newEquipment.brand} 
                    onChange={e => setNewEquipment({...newEquipment, brand: e.target.value})}
                    className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Serial Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SN-998822"
                    value={newEquipment.serial_number} 
                    onChange={e => setNewEquipment({...newEquipment, serial_number: e.target.value})}
                    className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary" 
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-background flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-textSecondary hover:text-textPrimary font-medium">Cancel</button>
              <button onClick={handleCreate} className="px-6 py-2 bg-primary text-card rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2">
                <Save className="w-4 h-4" /> Save Equipment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
