import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Sparkles, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hrApi, organizationApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Employee {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  branch_id?: string;
  cost_center_id?: string;
  crew_id?: string;
  join_date?: string;
  is_active: boolean;
  created_at?: string;
  branch?: { name: string };
  cost_center?: { name: string };
  crew?: { name: string; code: string };
}

export function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [crews, setCrews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Employee | null>(null);
  
  const [formData, setFormData] = useState<Omit<Employee, 'id' | 'created_at' | 'branch' | 'cost_center' | 'crew'>>({
    code: '', name: '', email: '', phone: '', role: '',
    branch_id: '', cost_center_id: '', crew_id: '', join_date: '',
    is_active: true
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [empRes, branchRes, ccRes, crewRes] = await Promise.all([
        hrApi.getEmployees(),
        organizationApi.getBranches(),
        organizationApi.getCostCenters(),
        hrApi.getCrews()
      ]);
      setBranches(branchRes.data);
      setCostCenters(ccRes.data);
      setCrews(crewRes.data);
      
      const sorted = empRes.data.sort((a: Employee, b: Employee) => 
        a.code.localeCompare(b.code)
      );
      setEmployees(sorted);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch employee data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isNewAccount = (dateStr?: string) => {
    if (!dateStr) return false;
    const createdDate = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  const columns = [
    { header: 'Employee Code', accessor: 'code' as keyof Employee, className: 'font-mono text-primary w-24' },
    { 
      header: 'Employee Name', 
      accessor: (row: Employee) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{row.name}</span>
            {isNewAccount(row.created_at) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse whitespace-nowrap">
                <Sparkles className="w-3 h-3" /> New
              </span>
            )}
          </div>
          <span className="text-xs text-textSecondary">{row.email || row.phone || '-'}</span>
        </div>
      )
    },
    { header: 'Role', accessor: 'role' as keyof Employee, className: 'text-textPrimary font-medium' },
    { 
      header: 'Branch & Cost Center', 
      accessor: (row: Employee) => (
        <div className="flex flex-col text-xs space-y-0.5">
          <span className="text-textPrimary font-medium">{row.branch?.name || '-'}</span>
          <span className="text-textSecondary">{row.cost_center?.name || '-'}</span>
        </div>
      )
    },
    {
      header: 'Crew',
      accessor: (row: Employee) => (
        <span className="text-sm text-textPrimary">
          {row.crew ? `${row.crew.code} - ${row.crew.name}` : <span className="text-textSecondary italic text-xs">No Crew</span>}
        </span>
      ),
      className: 'w-36'
    },
    { 
      header: 'Status', 
      accessor: (row: Employee) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          row.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      className: 'w-24'
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', email: '', phone: '', role: '', branch_id: '', cost_center_id: '', crew_id: '', join_date: '', is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: Employee) => {
    setEditingItem(row);
    setFormData({ 
      code: row.code, 
      name: row.name, 
      email: row.email || '',
      phone: row.phone || '',
      role: row.role || '',
      branch_id: row.branch_id || '',
      cost_center_id: row.cost_center_id || '',
      crew_id: row.crew_id || '',
      join_date: row.join_date || '',
      is_active: row.is_active 
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Employee) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const payload = { 
      ...formData,
      branch_id: formData.branch_id || null,
      cost_center_id: formData.cost_center_id || null,
      crew_id: formData.crew_id || null
    };

    try {
      if (editingItem) {
        await hrApi.updateEmployee(editingItem.id, payload);
        addToast('success', 'Employee Updated', `Employee ${formData.code} has been updated.`);
      } else {
        await hrApi.createEmployee(payload);
        addToast('success', 'Employee Created', `Employee ${formData.code} has been created.`);
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Failed to save. Ensure data is valid.';
      addToast('error', 'Save Failed', typeof errMsg === 'string' ? errMsg : 'Validation error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await hrApi.deleteEmployee(editingItem.id);
        addToast('success', 'Employee Deleted', `Employee ${editingItem.code} has been removed.`);
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error: any) {
        const errMsg = error.response?.data?.detail || 'Could not delete the employee.';
        addToast('error', 'Delete Failed', errMsg);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-textSecondary animate-pulse">Loading employee data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/master-data" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Employee</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Human Resources</span>
            <span>/</span>
            <span className="text-primary font-medium">Employee</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Employee Database"
          description="Manage general staff files, deployment locations, and cost centers."
          columns={columns}
          data={employees}
          searchPlaceholder="Search employee by code, name, or role..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit Employee" : "Add New Employee"} maxWidth="max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2 flex items-center gap-2"><User className="w-4 h-4"/> General Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Employee Code <span className="text-danger">*</span></label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. EMP-001"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Status <span className="text-danger">*</span></label>
                  <select value={formData.is_active ? 'Active' : 'Inactive'} onChange={e => setFormData({...formData, is_active: e.target.value === 'Active'})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Full Name <span className="text-danger">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Ahmad Suherman"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. ahmad@ansa.com"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. 0812345678"/>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Job Title / Role</label>
                <input type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Lead Driller, Geotech Engineer, Admin"/>
              </div>
            </div>

            {/* Employment Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2">Employment & Locations</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Branch Office</label>
                <select value={formData.branch_id} onChange={e => setFormData({...formData, branch_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Select Branch...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Cost Center</label>
                <select value={formData.cost_center_id} onChange={e => setFormData({...formData, cost_center_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Select Cost Center...</option>
                  {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>)}
                </select>
                <p className="text-[10px] text-textSecondary">Department code for budget/expense tracking.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Assigned Crew</label>
                <select value={formData.crew_id} onChange={e => setFormData({...formData, crew_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">No Crew Assignment...</option>
                  {crews.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
                <p className="text-[10px] text-textSecondary">Field crew team assignment for this employee.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Join Date</label>
                <input type="date" value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"/>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete <span className="font-bold text-textPrimary">{editingItem?.name}</span>. This action cannot be undone.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} disabled={isSaving} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
