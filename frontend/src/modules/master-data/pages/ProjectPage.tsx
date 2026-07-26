import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { projectsApi, organizationApi, stakeholdersApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Project {
  id: string;
  company_id: string;
  customer_id?: string;
  code: string;
  name: string;
  status: string;
  contract_value?: string;
  contract_value_usd?: number;
  contract_value_idr?: number;
  is_active: boolean;
  created_at?: string;
  companyName?: string;
  customerName?: string;
}

export function ProjectPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState({ 
    company_id: '', 
    customer_id: '', 
    code: '', 
    name: '', 
    status: 'Planning', 
    contract_value: '', 
    contract_value_usd: 0,
    contract_value_idr: 0,
    is_active: true 
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [projRes, compRes, custRes] = await Promise.all([
        projectsApi.getProjects(),
        organizationApi.getCompanies(),
        stakeholdersApi.getCustomers()
      ]);
      setCompanies(compRes.data);
      setCustomers(custRes.data);
      
      const mapped = projRes.data.map((p: any) => ({
        ...p,
        companyName: compRes.data.find((c: any) => c.id === p.company_id)?.name || 'Unknown',
        customerName: custRes.data.find((c: any) => c.id === p.customer_id)?.name || '-'
      }));
      setProjects(mapped);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch projects data.');
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
    { header: 'Project Code', accessor: 'code' as keyof Project, className: 'font-mono text-primary w-32' },
    { 
      header: 'Project Name', 
      accessor: (row: Project) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{row.name}</span>
          {isNewAccount(row.created_at) && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse whitespace-nowrap">
              <Sparkles className="w-3 h-3" /> New
            </span>
          )}
        </div>
      )
    },
    { header: 'Company (Internal)', accessor: 'companyName' as keyof Project, className: 'text-textSecondary' },
    { header: 'Customer (Client)', accessor: 'customerName' as keyof Project, className: 'text-textSecondary font-medium' },
    { 
      header: 'Status', 
      accessor: (row: Project) => {
        let colorClass = 'bg-secondary/10 text-textSecondary';
        if (row.status === 'Planning') colorClass = 'bg-warning/10 text-warning';
        if (row.status === 'Active') colorClass = 'bg-primary/10 text-primary';
        if (row.status === 'Completed') colorClass = 'bg-success/10 text-success';
        if (row.status === 'Cancelled') colorClass = 'bg-danger/10 text-danger';

        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            {row.status}
          </span>
        );
      },
      className: 'w-24'
    },
    { header: 'Budget (IDR)', accessor: (row: Project) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.contract_value_idr || 0), className: 'text-textSecondary font-mono text-right w-32' },
    { header: 'Budget (USD)', accessor: (row: Project) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.contract_value_usd || 0), className: 'text-textSecondary font-mono text-right w-32' },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ company_id: '', customer_id: '', code: '', name: '', status: 'Planning', contract_value: '', contract_value_usd: 0, contract_value_idr: 0, is_active: true });
    setIsFormOpen(true);
  };

  const handleEdit = (row: Project) => {
    setEditingItem(row);
    setFormData({ 
      company_id: row.company_id,
      customer_id: row.customer_id || '',
      code: row.code, 
      name: row.name, 
      status: row.status,
      contract_value: row.contract_value || '',
      contract_value_usd: row.contract_value_usd || 0,
      contract_value_idr: row.contract_value_idr || 0,
      is_active: row.is_active 
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Project) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Copy formData and clean up customer_id if empty
    const payload = { ...formData };
    if (!payload.customer_id) {
      delete payload.customer_id;
    }

    try {
      if (editingItem) {
        await projectsApi.updateProject(editingItem.id, payload);
        addToast('success', 'Project Updated', `Project ${formData.code} has been updated.`);
      } else {
        await projectsApi.createProject(payload);
        addToast('success', 'Project Created', `Project ${formData.code} has been created.`);
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
        await projectsApi.deleteProject(editingItem.id).catch(() => projectsApi.updateProject(editingItem.id, { is_active: false }));
        addToast('success', 'Project Deleted', `Project ${editingItem.code} has been removed.`);
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Delete Failed', 'Could not delete the project.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/master-data" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Project</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Project Structure</span>
            <span>/</span>
            <span className="text-primary font-medium">Project</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Projects (Contracts)"
          description="Manage main project headers and contracts."
          columns={columns}
          data={projects}
          searchPlaceholder="Search projects..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit Project" : "Add New Project"} maxWidth="max-w-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Internal Company <span className="text-danger">*</span></label>
              <select required value={formData.company_id} onChange={e => setFormData({...formData, company_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="">Select Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-[11px] text-textSecondary">Which internal PT handles this?</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Customer (Client)</label>
              <select value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-[11px] text-textSecondary">Which external client is paying?</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Project Code <span className="text-danger">*</span></label>
              <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. PRJ-2026-001"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Status <span className="text-danger">*</span></label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Project Name <span className="text-danger">*</span></label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Soil Investigation Phase 2"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Budget (IDR)</label>
              <input type="number" step="0.01" value={formData.contract_value_idr} onChange={e => setFormData({...formData, contract_value_idr: Number(e.target.value)})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. 1500000000"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Budget (USD)</label>
              <input type="number" step="0.01" value={formData.contract_value_usd} onChange={e => setFormData({...formData, contract_value_usd: Number(e.target.value)})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. 10000"/>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Contract Value Details (optional text)</label>
            <input type="text" value={formData.contract_value} onChange={e => setFormData({...formData, contract_value: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. IDR 1.5B & USD 10k"/>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Project'}
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
