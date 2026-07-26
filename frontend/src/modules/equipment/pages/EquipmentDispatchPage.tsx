import { useState, useEffect } from 'react';
import { Truck, Search, Plus, Filter, ArrowLeft, ArrowDownLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { equipmentApi, projectsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

export function EquipmentDispatchPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newDispatch, setNewDispatch] = useState({
    equipment_id: '',
    project_id: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    status: 'Dispatched',
    notes: ''
  });

  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [assignRes, equipRes, projRes] = await Promise.all([
        equipmentApi.getAssignments(),
        equipmentApi.getEquipments(),
        projectsApi.getProjects()
      ]);
      setAssignments(assignRes.data);
      setEquipments(equipRes.data);
      setProjects(projRes.data);
    } catch (error) {
      console.error('Error fetching dispatch data:', error);
      addToast('error', 'Fetch Error', 'Failed to fetch dispatch history.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispatch = async () => {
    try {
      if (!newDispatch.equipment_id || !newDispatch.project_id) {
        addToast('warning', 'Validation', 'Please select equipment and project.');
        return;
      }
      await equipmentApi.dispatchEquipment(newDispatch);
      addToast('success', 'Dispatched', 'Equipment successfully dispatched.');
      setIsModalOpen(false);
      fetchData(); // Refresh list to get new assignment and update equipment status
    } catch (error) {
      addToast('error', 'Dispatch Failed', 'Could not dispatch equipment.');
    }
  };

  const handleReturn = async (assignmentId: string) => {
    try {
      await equipmentApi.returnEquipment(assignmentId, {
        return_date: new Date().toISOString().split('T')[0],
        status: 'Returned'
      });
      addToast('success', 'Returned', 'Equipment successfully returned.');
      fetchData();
    } catch (error) {
      addToast('error', 'Return Failed', 'Could not process return.');
    }
  };

  const filteredAssignments = assignments.filter(a => 
    a.equipment?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.project?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-textPrimary">Equipment Dispatch</h1>
            <p className="text-textSecondary text-sm">Assign equipments to projects and track returns.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-card rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Truck className="w-5 h-5" />
          Dispatch Equipment
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Search by equipment or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 text-textSecondary text-xs uppercase border-b border-border">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Equipment</th>
                <th className="p-4 font-medium">Project Location</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-textSecondary">Loading data...</td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-textSecondary">No dispatch records found.</td>
                </tr>
              ) : (
                filteredAssignments.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="p-4">
                      <p className="text-textPrimary font-medium">{item.dispatch_date}</p>
                      {item.return_date && <p className="text-xs text-textSecondary">Ret: {item.return_date}</p>}
                    </td>
                    <td className="p-4 font-semibold text-primary">{item.equipment?.name}</td>
                    <td className="p-4 text-textSecondary">{item.project?.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'Dispatched' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end items-center gap-2">
                        {item.status === 'Dispatched' && (
                          <button 
                            onClick={() => handleReturn(item.id)}
                            className="flex items-center gap-1 text-xs font-medium text-success hover:underline px-2 py-1 bg-success/10 rounded-lg"
                          >
                            <ArrowDownLeft className="w-3 h-3" /> Mark Returned
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-textPrimary mb-4">Dispatch Equipment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Equipment</label>
                <select 
                  className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary"
                  value={newDispatch.equipment_id}
                  onChange={e => setNewDispatch({...newDispatch, equipment_id: e.target.value})}
                >
                  <option value="">Select Equipment...</option>
                  {equipments.filter(e => e.status === 'Active').map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Project</label>
                <select 
                  className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary"
                  value={newDispatch.project_id}
                  onChange={e => setNewDispatch({...newDispatch, project_id: e.target.value})}
                >
                  <option value="">Select Project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Dispatch Date</label>
                <input 
                  type="date"
                  className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary"
                  value={newDispatch.dispatch_date}
                  onChange={e => setNewDispatch({...newDispatch, dispatch_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Notes</label>
                <textarea 
                  className="w-full p-2 bg-background border border-border rounded-lg text-textPrimary"
                  value={newDispatch.notes}
                  onChange={e => setNewDispatch({...newDispatch, notes: e.target.value})}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 border border-border rounded-lg text-textSecondary font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDispatch}
                  className="flex-1 py-2 bg-primary text-card rounded-lg font-medium"
                >
                  Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
