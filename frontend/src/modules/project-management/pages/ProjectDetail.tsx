import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, HardHat, Pickaxe, MapPin, Layers, FileSpreadsheet, Plus, AlertCircle, Save } from 'lucide-react';
import { projectsApi, hrApi, inventoryApi } from '../../../services/api';
import { rabApi } from '../../../services/api';
import { getProjectResources, createProjectResource, getDailyReports, createDailyReport } from '../../../services/projectOpsApi';
import type { ProjectResource, DailyProgressReport } from '../../../services/projectOpsApi';
import { Modal } from '../../../components/ui/Modal';
import { DataTable } from '../../../components/ui/DataTable';
import { useToastStore } from '../../../store/toastStore';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'dpr' | 'rab'>('overview');
  
  const [project, setProject] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [dprs, setDprs] = useState<DailyProgressReport[]>([]);
  const [rabItems, setRabItems] = useState<any[]>([]);
  const [isRabFormOpen, setRabFormOpen] = useState(false);
  const [editingRab, setEditingRab] = useState<any | null>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [rabForm, setRabForm] = useState({ category: '', description: '', qty: 1, unit: 'unit', unit_cost_idr: 0, notes: '', sort_order: 0 });
  
  // Master Data for Dropdowns
  const [crews, setCrews] = useState<any[]>([]);
  const [rigs, setRigs] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const addToast = useToastStore((state) => state.addToast);

  const fetchProjectData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      
      const [projRes, areasRes, resRes, dprRes, crewsRes, rigsRes] = await Promise.all([
        projectsApi.getProject(id),
        projectsApi.getAreas(),
        getProjectResources(id),
        getDailyReports(id),
        hrApi.getCrews(),
        inventoryApi.getRigs()
      ]);
      
      setProject(projRes.data);
      setAreas(areasRes.data.filter((a: any) => a.project_id === id));
      setResources(resRes);
      setDprs(dprRes);
      setCrews(crewsRes.data);
      setRigs(rigsRes.data);
      
      // Fetch RAB
      try {
        const rabRes = await rabApi.getByProject(id);
        setRabItems(rabRes.data);
      } catch {}
      
    } catch (error) {
      console.error(error);
      addToast('error', 'Error', 'Failed to fetch project details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  // Modals state
  const [isResourceModalOpen, setResourceModalOpen] = useState(false);
  const [isDprModalOpen, setDprModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [resourceForm, setResourceForm] = useState({ resource_type: 'Crew', resource_id: '', start_date: new Date().toISOString().split('T')[0], end_date: '', notes: '' });
  const [dprForm, setDprForm] = useState({ area_id: '', report_date: new Date().toISOString().split('T')[0], weather: 'Sunny', drilling_depth: 0, activities_summary: '', issues_encountered: '' });

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);
    try {
      await createProjectResource({ ...resourceForm, project_id: id });
      addToast('success', 'Assigned', 'Resource assigned to project');
      setResourceModalOpen(false);
      fetchProjectData();
    } catch (error) {
      addToast('error', 'Error', 'Failed to assign resource');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);
    try {
      await createDailyReport({ ...dprForm, project_id: id, drilling_depth: Number(dprForm.drilling_depth) });
      addToast('success', 'Submitted', 'Daily Progress Report saved');
      setDprModalOpen(false);
      fetchProjectData();
    } catch (error) {
      addToast('error', 'Error', 'Failed to submit report');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-textSecondary">Loading...</div>;
  if (!project) return <div className="p-8 text-center text-danger">Project not found</div>;

  const resourceColumns = [
    { header: 'Type', accessor: (r: ProjectResource) => <span className={`px-2 py-1 rounded text-xs font-bold ${r.resource_type === 'Crew' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>{r.resource_type}</span> },
    { header: 'Resource Name', accessor: (r: ProjectResource) => {
        if (r.resource_type === 'Crew') return crews.find(c => c.id === r.resource_id)?.name || r.resource_id;
        if (r.resource_type === 'Rig') return rigs.find(rig => rig.id === r.resource_id)?.name || r.resource_id;
        return r.resource_id;
    } },
    { header: 'Start Date', accessor: 'start_date' as keyof ProjectResource },
    { header: 'End Date', accessor: (r: ProjectResource) => r.end_date || 'Ongoing', className: 'text-textSecondary' },
    { header: 'Notes', accessor: (r: ProjectResource) => r.notes || '-', className: 'text-textSecondary' },
  ];

  const dprColumns = [
    { header: 'Date', accessor: 'report_date' as keyof DailyProgressReport, className: 'font-mono' },
    { header: 'Area', accessor: (r: DailyProgressReport) => areas.find(a => a.id === r.area_id)?.name || 'General' },
    { header: 'Weather', accessor: 'weather' as keyof DailyProgressReport },
    { header: 'Depth (m)', accessor: 'drilling_depth' as keyof DailyProgressReport, className: 'text-right font-mono font-medium text-primary' },
    { header: 'Status', accessor: (r: DailyProgressReport) => <span className="px-2 py-1 rounded text-xs bg-success/10 text-success">{r.status}</span> },
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center gap-4">
        <Link to="/projects" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-textPrimary">{project.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary`}>
              {project.status}
            </span>
          </div>
          <p className="text-sm font-mono text-textSecondary mt-1">{project.code}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'overview', icon: Layers, label: 'Overview' },
          { id: 'resources', icon: HardHat, label: 'Resources' },
          { id: 'dpr', icon: FileSpreadsheet, label: 'Daily Reports' },
          { id: 'rab', icon: Pickaxe, label: 'RAB / Budget' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-secondary/10'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-textPrimary mb-4">Project Structure</h3>
                {areas.length === 0 ? (
                  <div className="text-center p-6 text-textSecondary border border-dashed border-border rounded-lg">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No areas defined yet. Add areas in Master Data.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {areas.map(area => (
                      <div key={area.id} className="p-3 border border-border rounded-lg bg-background flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-bold text-textPrimary">{area.name}</p>
                          <p className="text-xs font-mono text-textSecondary">{area.code}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-textPrimary mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  <div><span className="text-textSecondary block">Contract Value</span><span className="font-medium text-textPrimary">{project.contract_value || '-'}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="bg-card border border-border rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background">
              <div>
                <h2 className="text-lg font-bold text-textPrimary">Allocated Resources</h2>
                <p className="text-xs text-textSecondary">Manage crews and rigs assigned to this project.</p>
              </div>
              <button onClick={() => setResourceModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                <Plus className="w-4 h-4" /> Assign Resource
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <DataTable columns={resourceColumns} data={resources} searchPlaceholder="Search resources..." />
            </div>
          </div>
        )}

        {activeTab === 'dpr' && (
          <div className="bg-card border border-border rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background">
              <div>
                <h2 className="text-lg font-bold text-textPrimary">Daily Progress Reports</h2>
                <p className="text-xs text-textSecondary">Monitor daily drilling depths and field activities.</p>
              </div>
              <button onClick={() => setDprModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                <Plus className="w-4 h-4" /> New DPR
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <DataTable columns={dprColumns} data={dprs} searchPlaceholder="Search reports..." />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={isResourceModalOpen} onClose={() => setResourceModalOpen(false)} title="Assign Resource" maxWidth="max-w-md">
        <form onSubmit={handleSaveResource} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Resource Type</label>
            <select value={resourceForm.resource_type} onChange={e => setResourceForm({...resourceForm, resource_type: e.target.value, resource_id: ''})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
              <option value="Crew">Drilling Crew</option>
              <option value="Rig">Drilling Rig</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Select {resourceForm.resource_type}</label>
            <select required value={resourceForm.resource_id} onChange={e => setResourceForm({...resourceForm, resource_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary">
              <option value="">-- Select --</option>
              {resourceForm.resource_type === 'Crew' && crews.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              {resourceForm.resource_type === 'Rig' && rigs.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Start Date</label>
              <input required type="date" value={resourceForm.start_date} onChange={e => setResourceForm({...resourceForm, start_date: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">End Date</label>
              <input type="date" value={resourceForm.end_date} onChange={e => setResourceForm({...resourceForm, end_date: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary"/>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setResourceModalOpen(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2"><Save className="w-4 h-4"/> Save</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDprModalOpen} onClose={() => setDprModalOpen(false)} title="New Daily Progress Report" maxWidth="max-w-xl">
        <form onSubmit={handleSaveDPR} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Report Date</label>
              <input required type="date" value={dprForm.report_date} onChange={e => setDprForm({...dprForm, report_date: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Area (Optional)</label>
              <select value={dprForm.area_id} onChange={e => setDprForm({...dprForm, area_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
                <option value="">General Project</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Weather</label>
              <select value={dprForm.weather} onChange={e => setDprForm({...dprForm, weather: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
                <option value="Sunny">Sunny</option>
                <option value="Cloudy">Cloudy</option>
                <option value="Rain">Rain</option>
                <option value="Heavy Rain">Heavy Rain</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Drilling Depth (meters)</label>
              <input required type="number" step="0.1" min="0" value={dprForm.drilling_depth} onChange={e => setDprForm({...dprForm, drilling_depth: Number(e.target.value)})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary"/>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Activities Summary</label>
            <textarea rows={3} value={dprForm.activities_summary} onChange={e => setDprForm({...dprForm, activities_summary: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="What happened today?"></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setDprModalOpen(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2"><Save className="w-4 h-4"/> Submit</button>
          </div>
        </form>
      </Modal>

      {/* ===== RAB TAB PANEL ===== */}
      {activeTab === 'rab' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-textPrimary">Rencana Anggaran Biaya (RAB)</h3>
              <p className="text-sm text-textSecondary mt-0.5">Budget detail per item pekerjaan. Klik "Tambah Item" untuk menambah baris anggaran.</p>
            </div>
            <div className="flex gap-2">
              {/* Import CSV */}
              <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm font-medium cursor-pointer hover:bg-background text-textSecondary transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
                {isImportingCsv ? 'Importing...' : 'Import CSV'}
                <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !id) return;
                  setIsImportingCsv(true);
                  try {
                    const res = await rabApi.importCsv(id, file);
                    addToast('success', 'Import Selesai', `${res.data.created} baris berhasil diimport`);
                    const rabRes = await rabApi.getByProject(id);
                    setRabItems(rabRes.data);
                  } catch {
                    addToast('error', 'Import Gagal', 'Gagal mengimport file CSV');
                  } finally {
                    setIsImportingCsv(false);
                    e.target.value = '';
                  }
                }} />
              </label>
              <button
                onClick={() => { setEditingRab(null); setRabForm({ category: '', description: '', qty: 1, unit: 'unit', unit_cost_idr: 0, notes: '', sort_order: rabItems.length }); setRabFormOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> Tambah Item
              </button>
            </div>
          </div>

          {/* CSV Template Download */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-textSecondary flex items-center justify-between">
            <span>💡 Gunakan template CSV untuk impor massal: <code className="text-xs bg-background px-1 py-0.5 rounded">category, description, qty, unit, unit_cost_idr, notes</code></span>
            <button
              onClick={() => {
                const csv = 'category,description,qty,unit,unit_cost_idr,notes\n"I. Data Acquisition","Senior Geophysist Engineer",1,pax,2000000,""\n"I. Data Acquisition","Local Labour",2,man,500000,"by Client"';
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'template_rab.csv'; a.click();
              }}
              className="text-primary hover:underline text-xs font-medium"
            >
              Unduh Template
            </button>
          </div>

          {/* RAB Table */}
          {rabItems.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Pickaxe className="w-10 h-10 mx-auto text-textSecondary/30 mb-3" />
              <p className="text-textSecondary">Belum ada item RAB. Klik "Tambah Item" atau impor dari CSV.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Summary */}
              <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
                <span className="text-sm text-textSecondary">{rabItems.length} item anggaran</span>
                <span className="font-bold text-textPrimary">
                  Total Budget: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(rabItems.reduce((s, r) => s + (r.total_cost_idr || 0), 0))}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-background text-textSecondary">
                    <tr>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Deskripsi Pekerjaan</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-center">Satuan</th>
                      <th className="px-4 py-3 text-right">Harga Satuan</th>
                      <th className="px-4 py-3 text-right">Total Budget</th>
                      <th className="px-4 py-3">Catatan</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(() => {
                      const grouped: Record<string, any[]> = {};
                      rabItems.forEach(r => {
                        if (!grouped[r.category]) grouped[r.category] = [];
                        grouped[r.category].push(r);
                      });
                      return Object.entries(grouped).map(([cat, items]) => (
                        <>
                          <tr key={`cat-${cat}`} className="bg-primary/5">
                            <td colSpan={8} className="px-4 py-2 font-bold text-primary text-xs uppercase tracking-wider">{cat}</td>
                          </tr>
                          {items.map(item => (
                            <tr key={item.id} className="hover:bg-background/50 group">
                              <td className="px-4 py-3 text-textSecondary text-xs"></td>
                              <td className="px-4 py-3 text-textPrimary">{item.description}</td>
                              <td className="px-4 py-3 text-center font-mono">{item.qty}</td>
                              <td className="px-4 py-3 text-center text-textSecondary">{item.unit}</td>
                              <td className="px-4 py-3 text-right font-mono">{new Intl.NumberFormat('id-ID').format(item.unit_cost_idr)}</td>
                              <td className="px-4 py-3 text-right font-bold text-textPrimary">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.total_cost_idr)}</td>
                              <td className="px-4 py-3 text-textSecondary text-xs italic">{item.notes || '-'}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingRab(item); setRabForm({ category: item.category, description: item.description, qty: item.qty, unit: item.unit, unit_cost_idr: item.unit_cost_idr, notes: item.notes || '', sort_order: item.sort_order }); setRabFormOpen(true); }} className="p-1.5 hover:text-primary text-textSecondary hover:bg-primary/10 rounded transition-colors" title="Edit">✏️</button>
                                  <button onClick={async () => { if (!confirm('Hapus item ini?')) return; await rabApi.delete(item.id); setRabItems(prev => prev.filter(r => r.id !== item.id)); addToast('success', 'Dihapus', 'Item RAB dihapus'); }} className="p-1.5 hover:text-danger text-textSecondary hover:bg-danger/10 rounded transition-colors" title="Hapus">🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr key={`sub-${cat}`} className="bg-background/30">
                            <td colSpan={5} className="px-4 py-2 text-right text-xs text-textSecondary font-medium">Sub Total {cat}</td>
                            <td className="px-4 py-2 text-right font-bold text-sm text-textPrimary">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(items.reduce((s, r) => s + r.total_cost_idr, 0))}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </>
                      ));
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/10">
                      <td colSpan={5} className="px-4 py-3 text-right font-bold text-textPrimary">GRAND TOTAL</td>
                      <td className="px-4 py-3 text-right font-bold text-primary text-base">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(rabItems.reduce((s, r) => s + r.total_cost_idr, 0))}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RAB Form Modal */}
      <Modal isOpen={isRabFormOpen} onClose={() => setRabFormOpen(false)} title={editingRab ? 'Edit Item RAB' : 'Tambah Item RAB'} maxWidth="max-w-xl">
        <form onSubmit={async (e) => {
          e.preventDefault();
          setIsSaving(true);
          try {
            const payload = { ...rabForm, total_cost_idr: rabForm.qty * rabForm.unit_cost_idr };
            if (editingRab) {
              await rabApi.update(editingRab.id, payload);
              addToast('success', 'Diperbarui', 'Item RAB berhasil diperbarui');
            } else {
              await rabApi.create({ ...payload, project_id: id! });
              addToast('success', 'Ditambahkan', 'Item RAB berhasil ditambahkan');
            }
            const rabRes = await rabApi.getByProject(id!);
            setRabItems(rabRes.data);
            setRabFormOpen(false);
          } catch {
            addToast('error', 'Error', 'Gagal menyimpan item RAB');
          } finally {
            setIsSaving(false);
          }
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-textPrimary">Kategori <span className="text-danger">*</span></label>
              <input required type="text" list="rab-categories" value={rabForm.category} onChange={e => setRabForm({...rabForm, category: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. I. Data Acquisition" />
              <datalist id="rab-categories">
                {[...new Set(rabItems.map(r => r.category))].map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-textPrimary">Deskripsi Pekerjaan <span className="text-danger">*</span></label>
              <input required type="text" value={rabForm.description} onChange={e => setRabForm({...rabForm, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Senior Geophysist Engineer" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Qty</label>
              <input type="number" step="0.01" min="0" value={rabForm.qty} onChange={e => setRabForm({...rabForm, qty: Number(e.target.value)})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Satuan</label>
              <input type="text" list="rab-units" value={rabForm.unit} onChange={e => setRabForm({...rabForm, unit: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" />
              <datalist id="rab-units">
                {['unit', 'pax', 'man', 'kg', 'lump sum', 'trip', 'days', 'bulan'].map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-textPrimary">Harga Satuan (IDR)</label>
              <input type="text" value={rabForm.unit_cost_idr === 0 ? '' : new Intl.NumberFormat('id-ID').format(rabForm.unit_cost_idr)} onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                setRabForm({...rabForm, unit_cost_idr: Number(val)});
              }} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="0" />
              <p className="text-xs text-textSecondary">Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(rabForm.qty * rabForm.unit_cost_idr)}</p>
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-textPrimary">Catatan</label>
              <input type="text" value={rabForm.notes} onChange={e => setRabForm({...rabForm, notes: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. by Client, included in fee, dll" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={() => setRabFormOpen(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Batal</button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
