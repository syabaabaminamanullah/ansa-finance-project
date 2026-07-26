import React, { useState, useEffect } from 'react';
import { hrApi, organizationApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import { DataTable } from '../../../components/ui/DataTable';
import { Plus, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmployeeListPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [crews, setCrews] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    email: '',
    phone: '',
    role: '',
    branch_id: '',
    cost_center_id: '',
    crew_id: '',
    join_date: ''
  });

  const addToast = useToastStore((state) => state.addToast);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [empRes, branchRes, ccRes, crewRes] = await Promise.all([
        hrApi.getEmployees(),
        organizationApi.getBranches(),
        organizationApi.getCostCenters(),
        hrApi.getCrews()
      ]);
      setEmployees(empRes.data);
      setBranches(branchRes.data);
      setCostCenters(ccRes.data);
      setCrews(crewRes.data);
    } catch (error) {
      console.error(error);
      addToast('error', 'Error', 'Failed to fetch HR data');
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
      
      await hrApi.createEmployee(payload);
      addToast('success', 'Success', 'Employee created successfully');
      setIsModalOpen(false);
      setFormData({
        code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        email: '',
        phone: '',
        role: '',
        branch_id: '',
        cost_center_id: '',
        crew_id: '',
        join_date: ''
      });
      fetchAllData();
    } catch (error: any) {
      console.error(error);
      addToast('error', 'Error', error.response?.data?.detail || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { header: 'Emp Code', accessor: 'code' as keyof any, render: (val: string) => <span className="font-mono text-xs bg-secondary/30 px-2 py-1 rounded-md">{val}</span> },
    { header: 'Name', accessor: 'name' as keyof any, render: (val: string) => <span className="font-bold text-primary">{val}</span> },
    { header: 'Role', accessor: 'role' as keyof any },
    { header: 'Email', accessor: 'email' as keyof any },
    { header: 'Phone', accessor: 'phone' as keyof any },
    { 
      header: 'Branch', 
      accessor: 'branch_id' as keyof any,
      render: (val: string) => branches.find(b => b.id === val)?.name || '-'
    },
    { 
      header: 'Crew', 
      accessor: 'crew_id' as keyof any,
      render: (val: string) => crews.find(c => c.id === val)?.name || '-'
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
            <h1 className="text-2xl font-bold text-textPrimary">Employee List</h1>
            <p className="text-textSecondary mt-1">Manage master data and register new employees</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
          >
            <Plus size={18} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <DataTable
          columns={columns}
          data={employees}
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
              <h2 className="text-xl font-bold text-textPrimary">Add New Employee</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-textSecondary hover:text-textPrimary transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="empForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Employee Code *</label>
                    <input
                      required
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Role / Job Title *</label>
                    <input
                      required
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. Driller, Engineer, Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Join Date</label>
                    <input
                      type="date"
                      value={formData.join_date}
                      onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Branch</label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">-- Main Office / General --</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Cost Center</label>
                    <select
                      value={formData.cost_center_id}
                      onChange={(e) => setFormData({...formData, cost_center_id: e.target.value})}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">-- No Cost Center --</option>
                      {costCenters.map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                      ))}
                    </select>
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
                form="empForm"
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
