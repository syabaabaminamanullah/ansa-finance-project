import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, AlertTriangle, Sparkles, Users2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { hrApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface CrewMember {
  id: string;
  code: string;
  name: string;
  role?: string;
  is_active: boolean;
}

interface Crew {
  id: string;
  code: string;
  name: string;
  description?: string;
  leader_id?: string;
  is_active: boolean;
  created_at?: string;
  leader?: CrewMember;
  members?: CrewMember[];
}

export function CrewPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Crew | null>(null);
  
  const [formData, setFormData] = useState<Omit<Crew, 'id' | 'created_at' | 'leader' | 'members'>>({
    code: '', name: '', description: '', leader_id: '', is_active: true
  });
  
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [crewRes, empRes] = await Promise.all([
        hrApi.getCrews(),
        hrApi.getEmployees()
      ]);
      setEmployees(empRes.data.filter((e: any) => e.is_active));
      
      const sorted = crewRes.data.sort((a: Crew, b: Crew) => 
        a.code.localeCompare(b.code)
      );
      setCrews(sorted);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch crew data.');
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
    { header: 'Crew Code', accessor: 'code' as keyof Crew, className: 'font-mono text-primary w-24' },
    { 
      header: 'Crew Name', 
      accessor: (row: Crew) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{row.name}</span>
            {isNewAccount(row.created_at) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20 animate-pulse whitespace-nowrap">
                <Sparkles className="w-3 h-3" /> New
              </span>
            )}
          </div>
          <span className="text-xs text-textSecondary">{row.description || '-'}</span>
        </div>
      )
    },
    { 
      header: 'Crew Leader', 
      accessor: (row: Crew) => (
        row.leader ? (
          <div className="flex flex-col">
            <span className="font-bold text-textPrimary">{row.leader.name}</span>
            <span className="text-xs text-textSecondary font-mono">{row.leader.code} ({row.leader.role || '-'})</span>
          </div>
        ) : '-'
      )
    },
    { 
      header: 'Members Count', 
      accessor: (row: Crew) => (
        <span className="px-2 py-1 bg-secondary/20 rounded-md text-xs font-semibold text-textPrimary">
          {row.members?.length || 0} crew members
        </span>
      ),
      className: 'w-36'
    },
    { 
      header: 'Status', 
      accessor: (row: Crew) => (
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
    setFormData({ code: '', name: '', description: '', leader_id: '', is_active: true });
    setSelectedMemberIds([]);
    setIsFormOpen(true);
  };

  const handleEdit = (row: Crew) => {
    setEditingItem(row);
    setFormData({ 
      code: row.code, 
      name: row.name, 
      description: row.description || '',
      leader_id: row.leader_id || '',
      is_active: row.is_active 
    });
    setSelectedMemberIds(row.members?.map(m => m.id) || []);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (row: Crew) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const handleMemberToggle = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const payload = { 
      ...formData,
      leader_id: formData.leader_id || null,
      member_ids: selectedMemberIds
    };

    try {
      if (editingItem) {
        await hrApi.updateCrew(editingItem.id, payload);
        addToast('success', 'Crew Updated', `Crew ${formData.code} has been updated.`);
      } else {
        await hrApi.createCrew(payload);
        addToast('success', 'Crew Created', `Crew ${formData.code} has been created.`);
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
        await hrApi.deleteCrew(editingItem.id);
        addToast('success', 'Crew Deleted', `Crew ${editingItem.code} has been removed.`);
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Delete Failed', 'Could not delete the crew.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-textSecondary animate-pulse">Loading crew data...</div>
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
          <h1 className="text-2xl font-bold text-textPrimary">Crew</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/master-data" className="hover:text-primary transition-colors">Master Data</Link>
            <span>/</span>
            <span className="text-textPrimary font-medium">Human Resources</span>
            <span>/</span>
            <span className="text-primary font-medium">Crew</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Crew Database"
          description="Manage field drilling crews, assign crew leaders, and set member lists."
          columns={columns}
          data={crews}
          searchPlaceholder="Search crew by code or name..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit Crew" : "Add New Crew"} maxWidth="max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2 flex items-center gap-2"><Users2 className="w-4 h-4"/> Crew Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-textPrimary">Crew Code <span className="text-danger">*</span></label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. CRW-A"/>
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
                <label className="text-xs font-medium text-textPrimary">Crew Name <span className="text-danger">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="e.g. Drilling Team A"/>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary" placeholder="Details about this drilling team..."/>
              </div>
            </div>

            {/* Crew Assignments */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-textPrimary border-b border-border pb-2">Assignments & Members</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary">Crew Leader / Supervisor</label>
                <select value={formData.leader_id} onChange={e => setFormData({...formData, leader_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
                  <option value="">Select Leader...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.code} - {emp.name} ({emp.role || 'Staff'})</option>)}
                </select>
                <p className="text-[10px] text-textSecondary">Responsible supervisor for the field operations.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-textPrimary flex justify-between">
                  <span>Crew Members</span>
                  <span className="text-[10px] text-primary">{selectedMemberIds.length} selected</span>
                </label>
                <div className="border border-border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-background">
                  {employees.map(emp => {
                    const isChecked = selectedMemberIds.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-2.5 text-sm text-textPrimary cursor-pointer hover:bg-secondary/10 p-1 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleMemberToggle(emp.id)}
                          className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs">{emp.name}</span>
                          <span className="text-[10px] text-textSecondary font-mono">{emp.code} | {emp.role || 'No Role'}</span>
                        </div>
                      </label>
                    );
                  })}
                  {employees.length === 0 && (
                    <p className="text-xs text-textSecondary text-center py-4">No active employees to assign.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Crew'}
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
