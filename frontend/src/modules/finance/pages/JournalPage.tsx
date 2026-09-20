import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { CoaSelect } from '../../../components/ui/CoaSelect';
import { DatePicker } from '../../../components/ui/DatePicker';
import { ArrowLeft, Save, Plus, Trash2, ArrowRight, MapPin, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, financialsApi, projectsApi, rabApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface JournalLine {
  id?: string;
  account_id: string;
  project_id?: string;
  project_rab_id?: string;
  description: string;
  debit: number;
  credit: number;
}

interface Journal {
  id: string;
  journal_number: string;
  date: string;
  description: string;
  status: string;
  lines?: JournalLine[];
}

interface COA {
  id: string;
  account_code: string;
  account_name: string;
}

interface Project {
  id: string;
  code: string;
  name: string;
}

export function JournalPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [coas, setCoas] = useState<COA[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rabItemsByProject, setRabItemsByProject] = useState<Record<string, any[]>>({});
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Journal | null>(null);
  
  const [formData, setFormData] = useState<{
    journal_number: string;
    date: string;
    description: string;
    lines: JournalLine[];
  }>({
    journal_number: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    lines: [
      { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 },
      { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 }
    ]
  });

  const fetchRabItems = async (projectId: string) => {
    if (!projectId || rabItemsByProject[projectId]) return;
    try {
      const res = await rabApi.getByProject(projectId);
      setRabItemsByProject(prev => ({ ...prev, [projectId]: res.data }));
    } catch (e) {
      console.error(e);
      setRabItemsByProject(prev => ({ ...prev, [projectId]: [] }));
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [journalsRes, coasRes, projectsRes] = await Promise.all([
        financeApi.getJournals(),
        financialsApi.getCoas(),
        projectsApi.getProjects()
      ]);
      const sortedJournals = [...journalsRes.data].sort((a: Journal, b: Journal) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setJournals(sortedJournals);
      const sortedCoas = [...coasRes.data].sort((a: any, b: any) => {
        const codeA = String(a.account_code || a.code || '');
        const codeB = String(b.account_code || b.code || '');
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setCoas(sortedCoas);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch journals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { header: 'Journal No.', accessor: 'journal_number' as keyof Journal, className: 'font-mono text-primary font-bold' },
    { header: 'Date', accessor: 'date' as keyof Journal },
    { header: 'Description', accessor: 'description' as keyof Journal },
    {
      header: 'Tag Proyek / Lokasi',
      accessor: (row: Journal) => {
        const pIds = Array.from(new Set(row.lines?.map(l => l.project_id).filter(Boolean)));
        if (pIds.length === 0) {
          return (
            <span
              title="Overhead (Non-Project / Head Office Operation)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100/90 text-slate-600 border border-slate-200/90 shadow-sm whitespace-nowrap cursor-default select-none"
            >
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Overhead</span>
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {pIds.map(pid => {
              const proj = projects.find(p => p.id === pid);
              const label = proj ? proj.code : pid;
              return (
                <span
                  key={pid}
                  title={proj ? `${proj.code} - ${proj.name}` : String(pid)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold tracking-tight bg-gradient-to-r from-emerald-50 to-teal-50/90 text-emerald-800 border border-emerald-300/80 shadow-[0_1px_2px_rgba(5,150,105,0.08)] hover:border-emerald-500 hover:shadow-sm transition-all cursor-default select-none whitespace-nowrap"
                >
                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{label}</span>
                </span>
              );
            })}
          </div>
        );
      },
      className: 'w-36 whitespace-nowrap text-xs'
    },
    { 
      header: 'Total Amount', 
      accessor: (row: Journal) => formatCurrency(row.lines?.reduce((sum, l) => sum + Number(l.debit || 0), 0) || 0),
      className: 'font-medium text-right'
    },
    { 
      header: 'Status', 
      accessor: (row: Journal) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          row.status === 'Posted' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
        }`}>
          {row.status}
        </span>
      ),
      className: 'w-24 text-right'
    },
  ];

  const handleAdd = async () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      journal_number: 'Memuat...',
      date: today,
      description: '',
      lines: [
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 }
      ]
    });
    setIsFormOpen(true);
    try {
      const res = await financeApi.getNextJournalNumber(today);
      if (res.data?.next_number) {
        setFormData(prev => ({ ...prev, journal_number: res.data.next_number }));
      }
    } catch (err) {
      console.error('Failed to fetch next journal number:', err);
    }
  };

  const handleJournalDateChange = async (newDate: string) => {
    setFormData(prev => ({ ...prev, date: newDate }));
    if (newDate) {
      try {
        const res = await financeApi.getNextJournalNumber(newDate);
        if (res.data?.next_number) {
          setFormData(prev => ({ ...prev, journal_number: res.data.next_number }));
        }
      } catch (err) {
        console.error('Failed to fetch next journal number:', err);
      }
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 }]
    });
  };

  const handleRemoveLine = (index: number) => {
    if (formData.lines.length <= 2) {
      addToast('warning', 'Cannot Remove', 'A journal must have at least 2 lines.');
      return;
    }
    const newLines = [...formData.lines];
    newLines.splice(index, 1);
    setFormData({ ...formData, lines: newLines });
  };

  const updateLine = (index: number, field: keyof JournalLine, value: any) => {
    const newLines = [...formData.lines];
    
    if (field === 'project_id' && value !== newLines[index].project_id) {
      if (value) fetchRabItems(value);
      newLines[index] = { ...newLines[index], [field]: value, project_rab_id: '' };
    } else {
      newLines[index] = { ...newLines[index], [field]: value };
    }
    
    setFormData({ ...formData, lines: newLines });
  };

  const totalDebit = formData.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const totalCredit = formData.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      addToast('error', 'Unbalanced Journal', 'Total Debit must equal Total Credit.');
      return;
    }

    // Validate that all lines have an account selected
    if (formData.lines.some(l => !l.account_id)) {
      addToast('error', 'Validation Error', 'Please select an account for all lines.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        description: formData.description || undefined,
        lines: formData.lines.map(line => ({
          ...line,
          project_id: line.project_id === '' ? undefined : line.project_id,
          project_rab_id: line.project_rab_id === '' ? undefined : line.project_rab_id,
          cost_center_id: (line as any).cost_center_id === '' ? undefined : (line as any).cost_center_id,
          description: line.description || undefined
        }))
      };

      if (editingItem) {
        await financeApi.updateJournal(editingItem.id, payload);
        addToast('success', 'Journal Updated', `Journal ${formData.journal_number} has been updated.`);
      } else {
        await financeApi.createJournal(payload);
        addToast('success', 'Journal Created', `Journal ${formData.journal_number} has been created.`);
      }
      await fetchData();
      setIsFormOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Failed to save.';
      addToast('error', 'Save Failed', typeof errMsg === 'string' ? errMsg : 'Validation error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const formatNumber = (val: number) => {
    if (!val) return '';
    return val.toLocaleString('id-ID');
  };

  const handleNumberChange = (val: string, updater: (num: number) => void) => {
    const numericString = val.replace(/[^0-9]/g, '');
    updater(numericString ? parseInt(numericString, 10) : 0);
  };

  const handleEditClick = (row: Journal) => {
    if (row.status === 'Posted') {
      addToast('warning', 'Action Denied', 'A posted journal cannot be edited. Please unpost it first from All Journal Entries.');
      return;
    }
    setEditingItem(row);
    setFormData({
      journal_number: row.journal_number,
      date: row.date,
      description: row.description || '',
      lines: row.lines && row.lines.length > 0 ? row.lines : [
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 }
      ]
    });
    row.lines?.forEach(line => {
      if (line.project_id) fetchRabItems(line.project_id);
    });
    setIsFormOpen(true);
  };
  
  const handleViewClick = (row: Journal) => {
    setEditingItem(row);
    setIsViewOpen(true);
  };

  const handleDeleteClick = (row: Journal) => {
    if (row.status === 'Posted') {
      addToast('warning', 'Aksi Ditolak', 'Jurnal berstatus POSTED terkunci dan tidak dapat dihapus. Silakan Unpost terlebih dahulu di menu All Journal Entries.');
      return;
    }
    setEditingItem(row);
    setIsDeleteOpen(true);
  };


  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await financeApi.deleteJournal(editingItem.id);
        addToast('success', 'Journal Deleted', `Journal ${editingItem.journal_number} has been deleted.`);
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Delete Failed', 'Failed to delete the journal.');
      } finally {
        setIsSaving(false);
      }
    }
  };
  
  // Helper to get Account Code/Name for View Modal
  const getAccountDisplay = (accountId: string) => {
    const account = coas.find(c => c.id === accountId);
    return account ? `${account.account_code} - ${account.account_name}` : accountId;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Journal Entries</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">Journals</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Journal Entries"
          description="Manage general journal entries."
          columns={columns}
          data={journals}
          searchPlaceholder="Search journal..."
          onAdd={handleAdd}
          onEdit={handleEditClick}
          onView={handleViewClick}
          onDelete={handleDeleteClick}
          groupBy={(row) => row.date}
          isActionDisabled={(row) => {
            if (row.status === 'Posted') {
              return {
                disabled: true,
                message: 'Terkunci: Jurnal berstatus POSTED. Silakan Unpost di All Journal Entries terlebih dahulu.'
              };
            }
            return false;
          }}
        />
      </div>

      {/* Edit/Create Modal */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingItem(null); }} 
        title={editingItem ? `Edit Jurnal Entry (${editingItem.journal_number})` : "Buat Jurnal Baru"} 
        maxWidth="max-w-7xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-textPrimary">Journal No.</label>
                <span className="text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                  Otomatis
                </span>
              </div>
              <input 
                required 
                readOnly 
                type="text" 
                value={formData.journal_number} 
                title="Nomor Jurnal dihitung otomatis berurutan oleh sistem buku besar"
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-primary font-mono font-bold cursor-not-allowed select-none shadow-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Date</label>
              <DatePicker
                required
                value={formData.date}
                onChange={(val) => handleJournalDateChange(val)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Description</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Brief description..."/>
            </div>
          </div>

          <div className="border border-border rounded-lg shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-textSecondary uppercase bg-background border-b border-border rounded-t-lg">
                <tr>
                  <th className="px-4 py-3.5 w-[30%]">Account (COA)</th>
                  <th className="px-4 py-3.5 w-[15%]">Project</th>
                  <th className="px-4 py-3.5 w-[15%]">RAB / Anggaran</th>
                  <th className="px-4 py-3.5">Line Description</th>
                  <th className="px-4 py-3.5 w-40">Debit (Rp)</th>
                  <th className="px-4 py-3.5 w-40">Credit (Rp)</th>
                  <th className="px-4 py-3.5 w-12 text-center">Act</th>
                </tr>
              </thead>
              <tbody>
                {formData.lines.map((line, idx) => (
                  <tr key={idx} className="border-b border-border bg-card">
                    <td className="px-3 py-2 min-w-[320px]">
                      <CoaSelect
                        required
                        placement="top"
                        align="left"
                        popupWidth="w-[460px] sm:w-[520px]"
                        accounts={coas}
                        value={line.account_id}
                        onChange={(val) => updateLine(idx, 'account_id', val)}
                        placeholder="-- Pilih Akun COA --"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select 
                        value={line.project_id || ''}
                        onChange={(e) => updateLine(idx, 'project_id', e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-textPrimary"
                      >
                        <option value="">-- No Project --</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <select 
                        value={line.project_rab_id || ''}
                        onChange={(e) => updateLine(idx, 'project_rab_id', e.target.value)}
                        disabled={!line.project_id}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-textPrimary disabled:opacity-50"
                      >
                        <option value="">-- No RAB --</option>
                        {line.project_id && rabItemsByProject[line.project_id]?.map(r => (
                          <option key={r.id} value={r.id}>{r.category} → {r.description}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-textPrimary" 
                        placeholder="Memo..."
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        min="0"
                        value={formatNumber(line.debit)}
                        onChange={(e) => handleNumberChange(e.target.value, val => updateLine(idx, 'debit', val))}
                        disabled={line.credit > 0}
                        className={`w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-right ${line.credit > 0 ? 'opacity-50' : ''} text-textPrimary`} 
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input 
                        type="text" 
                        min="0"
                        value={formatNumber(line.credit)}
                        onChange={(e) => handleNumberChange(e.target.value, val => updateLine(idx, 'credit', val))}
                        disabled={line.debit > 0}
                        className={`w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-right ${line.debit > 0 ? 'opacity-50' : ''} text-textPrimary`} 
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => handleRemoveLine(idx)} className="p-1 text-danger hover:bg-danger/10 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-background font-semibold">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right">Total:</td>
                  <td className={`px-4 py-3 text-right ${totalDebit !== totalCredit ? 'text-danger' : 'text-success'}`}>{formatCurrency(totalDebit)}</td>
                  <td className={`px-4 py-3 text-right ${totalDebit !== totalCredit ? 'text-danger' : 'text-success'}`}>{formatCurrency(totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div className="p-3 bg-background border-t border-border flex justify-center">
              <button type="button" onClick={handleAddLine} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors">
                <Plus className="w-4 h-4" /> Add Line
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border mt-6">
            {!isBalanced && (
              <div className="text-sm font-medium text-danger bg-danger/10 px-3 py-1.5 rounded-md">
                Journal is unbalanced. Debit and Credit must be equal.
              </div>
            )}
            {isBalanced && (
              <div className="text-sm font-medium text-success bg-success/10 px-3 py-1.5 rounded-md flex items-center gap-2">
                Balanced <ArrowRight className="w-4 h-4" /> Ready to save
              </div>
            )}
            
            <div className="flex gap-3 ml-auto">
              <button 
                type="button" 
                onClick={() => { setIsFormOpen(false); setEditingItem(null); }} 
                className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary"
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={!isBalanced || _isSaving} 
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Save className="w-4 h-4" /> {editingItem ? 'Simpan Perubahan' : 'Simpan Jurnal'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Journal Details" maxWidth="max-w-4xl">
        {editingItem && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 pb-4 border-b border-border">
              <div>
                <p className="text-sm text-textSecondary">Journal No.</p>
                <p className="font-bold font-mono text-primary">{editingItem.journal_number}</p>
              </div>
              <div>
                <p className="text-sm text-textSecondary">Date</p>
                <p className="font-medium text-textPrimary">{editingItem.date}</p>
              </div>
              <div>
                <p className="text-sm text-textSecondary">Status</p>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                  editingItem.status === 'Posted' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                }`}>
                  {editingItem.status}
                </span>
              </div>
            </div>
            
            {editingItem.description && (
              <div>
                <p className="text-sm text-textSecondary mb-1">Description</p>
                <p className="text-sm text-textPrimary p-3 bg-background border border-border rounded-lg">{editingItem.description}</p>
              </div>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-textSecondary uppercase bg-background border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Account (COA)</th>
                    <th className="px-4 py-3">Project / RAB</th>
                    <th className="px-4 py-3">Line Description</th>
                    <th className="px-4 py-3 text-right">Debit (Rp)</th>
                    <th className="px-4 py-3 text-right">Credit (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {editingItem.lines?.map((line, idx) => (
                    <tr key={idx} className="border-b border-border bg-card">
                      <td className="px-4 py-3 font-medium text-textPrimary">{getAccountDisplay(line.account_id)}</td>
                      <td className="px-4 py-3 text-textSecondary">
                        <div className="font-medium text-textPrimary">{line.project_id ? projects.find(p => p.id === line.project_id)?.code : '-'}</div>
                        {line.project_rab_id && <div className="text-xs text-primary font-medium mt-0.5">Ber-Alokasi RAB</div>}
                      </td>
                      <td className="px-4 py-3 text-textSecondary">{line.description || '-'}</td>
                      <td className="px-4 py-3 text-right text-textPrimary">{formatNumber(line.debit)}</td>
                      <td className="px-4 py-3 text-right text-textPrimary">{formatNumber(line.credit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-background font-bold text-textPrimary">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right">Total:</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(editingItem.lines?.reduce((sum, l) => sum + l.debit, 0) || 0)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(editingItem.lines?.reduce((sum, l) => sum + l.credit, 0) || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <button type="button" onClick={() => setIsViewOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Close</button>
            </div>
          </div>
        )}
      </Modal>


      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><Trash2 className="w-6 h-6" /></div>
          <div>
            <h3 className="text-lg font-bold text-textPrimary">Delete this Journal?</h3>
            <p className="text-sm text-textSecondary mt-1">You are about to delete <span className="font-bold text-textPrimary">{editingItem?.journal_number}</span>. 
            {editingItem?.status === 'Posted' && <span className="block mt-2 text-danger font-semibold">WARNING: This is a POSTED journal. Deleting it will change your General Ledger and Financial Reports!</span>}
            </p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} disabled={_isSaving} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
