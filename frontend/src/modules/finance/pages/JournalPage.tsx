import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { ArrowLeft, Save, Plus, Trash2, ArrowRight } from 'lucide-react';
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
  const [isPostOpen, setIsPostOpen] = useState(false);
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
      setJournals(journalsRes.data);
      setCoas(coasRes.data);
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

  const handleAdd = () => {
    setFormData({
      journal_number: 'AUTO',
      date: new Date().toISOString().split('T')[0],
      description: '',
      lines: [
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', project_id: '', project_rab_id: '', description: '', debit: 0, credit: 0 }
      ]
    });
    setIsFormOpen(true);
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
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  const confirmPost = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await financeApi.updateJournalStatus(editingItem.id, { status: 'Posted' });
        addToast('success', 'Journal Posted', `Journal ${editingItem.journal_number} is now officially posted.`);
        await fetchData();
        setIsPostOpen(false);
        setIsFormOpen(false); // Close edit form too if it was open
      } catch (error) {
        addToast('error', 'Action Failed', 'Failed to post the journal.');
      } finally {
        setIsSaving(false);
      }
    }
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
        />
      </div>

      {/* Edit/Create Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create Journal Entry" maxWidth="max-w-4xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Journal No.</label>
              <input required type="text" value={formData.journal_number} onChange={e => setFormData({...formData, journal_number: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Date</label>
              <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Description</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Brief description..."/>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-textSecondary uppercase bg-background border-b border-border">
                <tr>
                  <th className="px-4 py-3 w-1/4">Account (COA)</th>
                  <th className="px-4 py-3 w-[15%]">Project</th>
                  <th className="px-4 py-3 w-[15%]">RAB / Anggaran</th>
                  <th className="px-4 py-3">Line Description</th>
                  <th className="px-4 py-3 w-32">Debit (Rp)</th>
                  <th className="px-4 py-3 w-32">Credit (Rp)</th>
                  <th className="px-4 py-3 w-12 text-center">Act</th>
                </tr>
              </thead>
              <tbody>
                {formData.lines.map((line, idx) => (
                  <tr key={idx} className="border-b border-border bg-card">
                    <td className="px-2 py-2">
                      <select 
                        required
                        value={line.account_id}
                        onChange={(e) => updateLine(idx, 'account_id', e.target.value)}
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-textPrimary"
                      >
                        <option value="">-- Select Account --</option>
                        {coas.map(c => (
                          <option key={c.id} value={c.id}>{c.account_code} - {c.account_name}</option>
                        ))}
                      </select>
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
              <button type="button" onClick={() => { setIsFormOpen(false); setEditingItem(null); }} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
              {editingItem && (
                <button type="button" onClick={() => setIsPostOpen(true)} disabled={!isBalanced || _isSaving} className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Post Journal
                </button>
              )}
              <button type="submit" disabled={!isBalanced || _isSaving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-4 h-4" /> {editingItem ? 'Update Journal' : 'Save Journal'}
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

      {/* Post Confirmation Modal */}
      <Modal isOpen={isPostOpen} onClose={() => setIsPostOpen(false)} title="Post Journal Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success"><ArrowRight className="w-6 h-6" /></div>
          <div>
            <h3 className="text-lg font-bold text-textPrimary">Post this Journal?</h3>
            <p className="text-sm text-textSecondary mt-1">You are about to post <span className="font-bold text-textPrimary">{editingItem?.journal_number}</span>. Once posted, it will affect the General Ledger and Financial Reports and <strong>cannot be deleted</strong>.</p>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsPostOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmPost} disabled={_isSaving} className="flex-1 px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50">Yes, Post</button>
          </div>
        </div>
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
