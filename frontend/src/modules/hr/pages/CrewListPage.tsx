import React, { useState, useEffect } from 'react';
import { hrApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import { DataTable } from '../../../components/ui/DataTable';
import { Plus, X, ArrowLeft, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CrewListPage() {
  const [crews, setCrews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    description: string;
    leader_id: string;
    member_ids: string[];
  }>({
    code: `CRW-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    description: '',
    leader_id: '',
    member_ids: []
  });

  const addToast = useToastStore((state) => state.addToast);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [crewRes, empRes] = await Promise.all([
        hrApi.getCrews(),
        hrApi.getEmployees()
      ]);
      setCrews(crewRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      console.error(error);
      addToast('error', 'Error', 'Failed to fetch Crew data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const payload = { ...formData };
      if (!payload.leader_id) payload.leader_id = ''; // backend handles empty string -> null
      
      await hrApi.createCrew(payload);
      addToast('success', 'Success', 'Crew created successfully');
      setIsModalOpen(false);
      setFormData({
        code: `CRW-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        description: '',
        leader_id: '',
        member_ids: []
      });
      fetchAllData();
    } catch (error: any) {
      console.error(error);
      addToast('error', 'Error', error.response?.data?.detail || 'Failed to create crew');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (empId: string) => {
    setFormData(prev => {
      const isSelected = prev.member_ids.includes(empId);
      if (isSelected) {
        return { ...prev, member_ids: prev.member_ids.filter(id => id !== empId) };
      } else {
        return { ...prev, member_ids: [...prev.member_ids, empId] };
      }
    });
  };

  const columns = [
    { header: 'Crew Code', accessor: 'code' as keyof any, render: (val: string) => <span className="font-mono text-xs bg-secondary/30 px-2 py-1 rounded-md">{val}</span> },
    { header: 'Crew Name', accessor: 'name' as keyof any, render: (val: string) => <span className="font-bold text-primary">{val}</span> },
    { header: 'Description', accessor: 'description' as keyof any },
    { 
      header: 'Leader', 
      accessor: 'leader_id' as keyof any,
      render: (val: string) => employees.find(e => e.id === val)?.name || <span className="text-textSecondary italic">No Leader</span>
    },
    { 
      header: 'Members', 
      accessor: 'id' as keyof any,
      render: (val: string) => {
        const count = employees.filter(e => e.crew_id === val && e.id !== crews.find(c => c.id === val)?.leader_id).length;
        return <span className="flex items-center gap-1 text-sm bg-background border border-border px-2 py-1 rounded-full"><Users className="w-3 h-3"/> {count}</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link 
            to="/hr"
            className="p-2 bg-card border border-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">Crew List</h1>
            <p className="text-textSecondary mt-1">Manage field crews and team assignments</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            <Plus size={18} />
            <span>Add Crew</span>
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <DataTable
          columns={columns}
          data={crews}
          isLoading={isLoading}
          searchable
          searchField="name"
        />
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold text-textPrimary">Add New Crew</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-textSecondary hover:text-textPrimary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="crewForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Crew Code *</label>
                    <input
                      required
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Crew Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. Drilling Team Alpha"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <label className="block text-sm font-medium text-textSecondary mb-1">Crew Leader</label>
                  <select
                    value={formData.leader_id}
                    onChange={(e) => setFormData({...formData, leader_id: e.target.value})}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">-- No Leader Assigned --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role || 'No Role'})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-textSecondary mb-2">Assign Members</label>
                  <div className="bg-background border border-border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                    {employees.filter(e => e.id !== formData.leader_id).length === 0 ? (
                      <p className="text-sm text-textSecondary p-2">No available employees to assign.</p>
                    ) : (
                      employees.filter(e => e.id !== formData.leader_id).map(emp => (
                        <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-secondary/10 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.member_ids.includes(emp.id)}
                            onChange={() => toggleMember(emp.id)}
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                          <div>
                            <p className="text-sm font-medium text-textPrimary">{emp.name}</p>
                            <p className="text-xs text-textSecondary">{emp.role || 'No Role'}</p>
                          </div>
                        </label>
                      ))
                    )}
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
                form="crewForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Crew'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
