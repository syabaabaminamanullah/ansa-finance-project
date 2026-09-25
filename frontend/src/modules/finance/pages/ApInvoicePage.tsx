import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { CoaSelect } from '../../../components/ui/CoaSelect';
import { DatePicker } from '../../../components/ui/DatePicker';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, stakeholdersApi, financialsApi, projectsApi, rabApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';

interface Vendor {
  id: string;
  name: string;
  code: string;
}

interface ApInvoiceLineItem {
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_price: number;
  item_code?: string;
}

interface ApInvoice {
  id: string;
  invoice_number: string;
  vendor_id: string;
  date: string;
  due_date: string;
  description: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  project_id?: string;
  amount_paid?: number;
  expense_account_id?: string;
  tax_account_id?: string;
  lines?: ApInvoiceLineItem[];   // Line items dari PO terkait (di-enrich backend)
}

interface Project {
  id: string;
  code: string;
  name: string;
}

export function ApInvoicePage() {
  const [invoices, setInvoices] = useState<ApInvoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ApInvoice | null>(null);
  const [coas, setCoas] = useState<any[]>([]);
  const [rabItems, setRabItems] = useState<any[]>([]);
  
  // Tax Calculator State
  const [taxRate, setTaxRate] = useState<number>(12); // Default to latest PPN 12%
  
  const [paymentData, setPaymentData] = useState({ 
    bank_account_id: '', 
    admin_fee: 0,
    admin_fee_account_id: '',
    amount_paid: 0
  });

  const [formData, setFormData] = useState<Omit<ApInvoice, 'id' | 'created_at'> & {amount_paid?: number}>({
    invoice_number: '', vendor_id: '', project_id: '', project_rab_id: '', date: '', due_date: '', description: '', amount: 0, tax_amount: 0, total_amount: 0, status: 'Unpaid', amount_paid: 0
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [invRes, vendRes, coasRes, projectsRes] = await Promise.all([
        financeApi.getApInvoices(),
        stakeholdersApi.getVendors(),
        financialsApi.getCoas(),
        projectsApi.getProjects()
      ]);
      setInvoices(invRes.data);
      setVendors(vendRes.data);
      const sortedCoas = [...coasRes.data].sort((a: any, b: any) => {
        const codeA = String(a.account_code || a.code || '');
        const codeB = String(b.account_code || b.code || '');
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setCoas(sortedCoas);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch AP data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const columns = [
    { header: 'Invoice No', accessor: 'invoice_number' as keyof ApInvoice, className: 'font-mono text-primary font-bold' },
    { 
      header: 'Vendor', 
      accessor: (row: ApInvoice) => {
        const vendor = vendors.find(v => v.id === row.vendor_id);
        return vendor ? vendor.name : 'Unknown';
      } 
    },
    { header: 'Date', accessor: 'date' as keyof ApInvoice },
    { header: 'Due Date', accessor: 'due_date' as keyof ApInvoice },
    { 
      header: 'Total Amount', 
      accessor: (row: ApInvoice) => formatCurrency(row.total_amount),
      className: 'text-right font-medium text-textPrimary'
    },
    { 
      header: 'Paid Amount', 
      accessor: (row: ApInvoice) => formatCurrency(row.amount_paid || 0),
      className: 'text-right font-medium text-success'
    },
    { 
      header: 'Balance Due', 
      accessor: (row: ApInvoice) => {
        const balance = row.total_amount - (row.amount_paid || 0);
        return formatCurrency(balance > 0 ? balance : 0);
      },
      className: 'text-right font-bold text-danger'
    },
    { 
      header: 'Status', 
      accessor: (row: ApInvoice) => (
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            row.status === 'Paid' ? 'bg-success/10 text-success' : 
            row.status === 'Partial' ? 'bg-warning/10 text-warning' : 
            'bg-danger/10 text-danger'
          }`}>
            {row.status}
          </span>
          {row.status !== 'Paid' && (
            <button 
              onClick={() => handlePaymentClick(row)}
              className="ml-2 px-2 py-1 bg-success text-white text-xs rounded hover:bg-success/90 transition-colors shadow-sm font-semibold"
            >
              Pay
            </button>
          )}
        </div>
      ),
      className: 'w-48'
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setTaxRate(12);
    setFormData({ 
      invoice_number: 'AUTO', 
      vendor_id: '', 
      project_id: '',
      date: new Date().toISOString().split('T')[0], 
      due_date: '', 
      description: '', 
      amount: 0, 
      tax_amount: 0, 
      total_amount: 0, 
      status: 'Unpaid' 
    });
    setIsFormOpen(true);
  };

  const handlePaymentClick = (row: ApInvoice) => {
    if (row.status === 'Paid') {
      addToast('warning', 'Already Paid', 'This bill is already paid.');
      return;
    }
    setEditingItem(row);
    setPaymentData({ 
      bank_account_id: '', 
      expense_account_id: '', 
      tax_account_id: '',
      admin_fee: 0,
      admin_fee_account_id: '',
      amount_paid: row.total_amount - (row.amount_paid || 0) // Default to balance due
    });
    setIsPaymentOpen(true);
  };

  const handleEdit = (row: ApInvoice) => {
    // Calculate effective tax rate
    let effectiveRate = 0;
    if (row.amount > 0) {
      effectiveRate = Math.round((row.tax_amount / row.amount) * 100);
    }
    
    if ([0, 11, 12].includes(effectiveRate)) {
      setTaxRate(effectiveRate);
    } else {
      setTaxRate(-1); // Custom
    }

    setEditingItem(row);
    setFormData({ 
      invoice_number: row.invoice_number, 
      vendor_id: row.vendor_id, 
      project_id: row.project_id || '',
      date: row.date, 
      due_date: row.due_date, 
      description: row.description, 
      amount: row.amount, 
      tax_amount: row.tax_amount, 
      total_amount: row.total_amount, 
      status: row.status,
      amount_paid: row.amount_paid || 0,
      expense_account_id: row.expense_account_id || '',
      tax_account_id: row.tax_account_id || ''
    });
    setIsFormOpen(true);
  };

  const handleViewClick = (row: ApInvoice) => {
    setEditingItem(row);
    setIsViewOpen(true);
  };

  const handleDeleteClick = (row: ApInvoice) => {
    setEditingItem(row);
    setIsDeleteOpen(true);
  };

  // Recalculate total amount when amount or tax changes
  useEffect(() => {
    // If tax rate is selected, auto calculate tax amount based on base amount
    let calculatedTax = formData.tax_amount;
    if (taxRate > 0) {
      calculatedTax = formData.amount * (taxRate / 100);
    } else if (taxRate === 0) {
      calculatedTax = 0;
    }

    setFormData(prev => {
      // Prevent infinite loop by only updating if values actually change
      if (prev.tax_amount === calculatedTax && prev.total_amount === (Number(prev.amount) + calculatedTax)) {
        return prev;
      }
      return {
        ...prev,
        tax_amount: calculatedTax,
        total_amount: Number(prev.amount) + calculatedTax
      };
    });
  }, [formData.amount, taxRate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_id) {
      addToast('error', 'Validation Error', 'Please select a vendor.');
      return;
    }
    
    setIsSaving(true);
    try {
      let savedInvoice;
      if (editingItem) {
        const res = await financeApi.updateApInvoice(editingItem.id, formData);
        savedInvoice = res.data;
        addToast('success', 'Invoice Updated', `Invoice ${formData.invoice_number} has been updated.`);
      } else {
        // NEW INVOICE: save first, then auto-create recognition journal
        const res = await financeApi.createApInvoice(formData);
        savedInvoice = res.data;
        
        // Auto-Journal: Pengakuan Hutang & Biaya
        // Only if expense_account_id and payable account exists
        const payableAccount = coas.find(c => c.account_code === '21100' || c.account_code === '2110' || c.account_code.startsWith('211'));
        if (formData.expense_account_id && payableAccount) {
          const journalLines: any[] = [
            {
              account_id: formData.expense_account_id,
              project_id: formData.project_id || null,
              description: `Pengakuan Biaya - ${savedInvoice.invoice_number}`,
              debit: formData.amount,
              credit: 0
            },
            {
              account_id: payableAccount.id,
              project_id: formData.project_id || null,
              description: `Pengakuan Hutang Vendor - ${savedInvoice.invoice_number}`,
              debit: 0,
              credit: formData.total_amount
            }
          ];
          if (formData.tax_account_id && formData.tax_amount > 0) {
            // PPN Masukan: Debit PPN, adjust Credit AP
            journalLines[0].debit = formData.amount;
            journalLines[1].credit = formData.amount;
            journalLines.push({
              account_id: formData.tax_account_id,
              project_id: formData.project_id || null,
              description: `PPN Masukan - ${savedInvoice.invoice_number}`,
              debit: formData.tax_amount,
              credit: 0
            });
            // Adjust payable to full total
            journalLines[1].credit = formData.total_amount;
          }
          await financeApi.createJournal({
            journal_number: `JV-AP-${savedInvoice.invoice_number}`,
            date: formData.date,
            description: `Auto-Journal Pengakuan Hutang: ${savedInvoice.invoice_number}`,
            lines: journalLines,
          });
          addToast('success', 'Invoice Created', `Invoice ${savedInvoice.invoice_number} dibuat & Jurnal Pengakuan Hutang otomatis ter-posting!`);
        } else {
          addToast('success', 'Invoice Created', `Invoice ${savedInvoice.invoice_number} dibuat. (Pilih Expense Account untuk auto-jurnal pengakuan hutang)`);
        }
      }
      await fetchData();
      setIsFormOpen(false);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Failed to save.';
      addToast('error', 'Save Failed', typeof errMsg === 'string' ? errMsg : 'Validation error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (editingItem) {
      setIsSaving(true);
      try {
        await financeApi.deleteApInvoice(editingItem.id);
        addToast('success', 'Invoice Deleted', `Invoice ${editingItem.invoice_number} has been removed.`);
        await fetchData();
        setIsDeleteOpen(false);
      } catch (error) {
        addToast('error', 'Delete Failed', 'Could not delete the invoice.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!paymentData.bank_account_id) {
      addToast('error', 'Validation Error', 'Bank account is required.');
      return;
    }

    setIsSaving(true);
    try {
      const newAmountPaid = (editingItem.amount_paid || 0) + paymentData.amount_paid;
      const isPartial = newAmountPaid < editingItem.total_amount;
      
      // Find AP Payable account (21100 / 2110)
      const payableAccount = coas.find(c => c.account_code === '21100' || c.account_code === '2110' || c.account_code.startsWith('211'));

      // Build journal lines:
      // If payable account exists → Debit Hutang Usaha (21100), Credit Bank (proper AP settlement)
      // Else fallback → Debit Expense, Credit Bank (simple cash payment)
      const journalLines: any[] = [];

      if (payableAccount) {
        journalLines.push({
          account_id: payableAccount.id,
          project_id: editingItem.project_id || null,
          description: `Pelunasan Hutang - ${editingItem.invoice_number}`,
          debit: paymentData.amount_paid,
          credit: 0
        });
      }

      journalLines.push({
        account_id: paymentData.bank_account_id,
        project_id: editingItem.project_id || null,
        description: `Pembayaran ke Vendor - ${editingItem.invoice_number}`,
        debit: 0,
        credit: Number(paymentData.amount_paid) + Number(paymentData.admin_fee || 0)
      });

      if (paymentData.admin_fee > 0 && paymentData.admin_fee_account_id) {
        journalLines.push({
          account_id: paymentData.admin_fee_account_id,
          project_id: editingItem.project_id || null,
          description: `Biaya Admin Bank - ${editingItem.invoice_number}`,
          debit: Number(paymentData.admin_fee),
          credit: 0
        });
      }

      await financeApi.createJournal({
        journal_number: `JV-PAY-${editingItem.invoice_number}`,
        date: new Date().toISOString().split('T')[0],
        description: `Auto-Journal Pembayaran: ${editingItem.invoice_number}`,
        lines: journalLines,
        status: 'Posted',
        ref_type: 'AP_Invoice_Payment',
        ref_id: editingItem.id,
      });

      // Update invoice amount_paid and status
      await financeApi.updateApInvoice(editingItem.id, { 
        status: isPartial ? 'Partial' : 'Paid',
        amount_paid: newAmountPaid
      });
      
      addToast('success', 'Pembayaran Berhasil', `Jurnal Pelunasan Hutang ${editingItem.invoice_number} otomatis di-posting!`);
      await fetchData();
      setIsPaymentOpen(false);
    } catch (error) {
      console.error(error);
      addToast('error', 'Payment Failed', 'Failed to process payment.');
    } finally {
      setIsSaving(false);
    }
  };

  const bankAccounts = coas.filter(c => c.account_code?.startsWith('111') || c.account_code?.startsWith('112'));
  const expAccounts = coas.filter(c => c.account_type?.toLowerCase() === 'expense' || c.account_type?.toLowerCase() === 'asset');
  const payableAccounts = coas.filter(c => c.account_type?.toLowerCase() === 'liability');
  const taxAccounts = coas.filter(c => c.account_type?.toLowerCase() === 'asset');

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Accounts Payable (AP)</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">AP Invoices</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Vendor Invoices (AP)"
          description="Manage vendor bills and track payments."
          columns={columns}
          data={invoices}
          searchPlaceholder="Search invoice no..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onView={handleViewClick}
          onDelete={handleDeleteClick}
        />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit AP Invoice" : "Add AP Invoice"} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Invoice No. <span className="text-danger">*</span></label>
              <input required type="text" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Vendor <span className="text-danger">*</span></label>
              <select required value={formData.vendor_id} onChange={e => setFormData({...formData, vendor_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
                <option value="">-- Select Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.code} - {v.name}</option>)}
              </select>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Project</label>
            <select value={formData.project_id || ''} onChange={async e => {
              const pid = e.target.value;
              setFormData({...formData, project_id: pid, project_rab_id: ''});
              if (pid) {
                try { const r = await rabApi.getByProject(pid); setRabItems(r.data); } catch { setRabItems([]); }
              } else { setRabItems([]); }
            }} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
              <option value="">-- Tidak Ada Proyek (Overhead Kantor) --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
            </select>
          </div>

          {/* RAB Allocation */}
          {formData.project_id && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Alokasi RAB / Pos Anggaran <span className="text-xs text-textSecondary">(Opsional)</span></label>
              <select value={formData.project_rab_id || ''} onChange={e => setFormData({...formData, project_rab_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
                <option value="">-- Biaya Proyek Umum (tanpa alokasi RAB) --</option>
                {rabItems.map(r => <option key={r.id} value={r.id}>{r.category} → {r.description}</option>)}
              </select>
              <p className="text-[11px] text-textSecondary">Pilih pos RAB agar tagihan ini tercatat pada anggaran spesifik proyek.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Invoice Date <span className="text-danger">*</span></label>
              <DatePicker
                required
                value={formData.date}
                onChange={(val) => setFormData({ ...formData, date: val })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Due Date <span className="text-danger">*</span></label>
              <DatePicker
                required
                value={formData.due_date}
                onChange={(val) => setFormData({ ...formData, due_date: val })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Description</label>
            <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Brief description..."/>
          </div>

          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-primary">Smart Tax Calculator</label>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-textSecondary">PPN Rate:</span>
                <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="px-2 py-1 bg-background border border-border rounded text-primary font-medium">
                  <option value={0}>0% (Non-PKP / Bebas PPN)</option>
                  <option value={11}>11% (Peraturan Lama)</option>
                  <option value={12}>12% (Terbaru - UU HPP)</option>
                  <option value={-1}>Custom Manual Input</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Base Amount (DPP)</label>
                <input type="text" min="0" value={formatNumber(formData.amount)} onChange={e => handleNumberChange(e.target.value, val => setFormData({...formData, amount: val}))} className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-textPrimary text-right font-medium"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Tax Amount (PPN)</label>
                <input type="text" min="0" disabled={taxRate >= 0} value={formatNumber(formData.tax_amount)} onChange={e => handleNumberChange(e.target.value, val => setFormData({...formData, tax_amount: val}))} className={`w-full px-3 py-2 border rounded-lg text-sm text-right ${taxRate >= 0 ? 'bg-background/50 border-transparent text-textSecondary' : 'bg-card border-border text-textPrimary'}`}/>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Total Invoice</label>
                <input type="text" disabled value={formatNumber(formData.total_amount)} className="w-full px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary font-bold text-right" readOnly/>
              </div>
            </div>
            {taxRate > 0 && (
              <p className="text-xs text-textSecondary mt-2 italic">*Tax amount is auto-calculated based on {taxRate}% PPN regulation.</p>
            )}
          </div>

          <div className="space-y-1.5 w-1/2">
            <label className="text-sm font-medium text-textPrimary">Payment Status</label>
            <select value={formData.status} onChange={e => {
              const newStatus = e.target.value;
              setFormData({
                ...formData, 
                status: newStatus,
                amount_paid: newStatus === 'Unpaid' ? 0 : newStatus === 'Paid' ? formData.total_amount : formData.amount_paid
              });
            }} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Expense/Asset Account <span className="text-xs text-textSecondary">(untuk auto-jurnal pengakuan biaya)</span></label>
            <CoaSelect
              accounts={expAccounts}
              value={(formData as any).expense_account_id || ''}
              onChange={(val) => setFormData({ ...formData, expense_account_id: val } as any)}
              placeholder="-- Pilih Akun Biaya/Aset --"
            />
            <p className="text-xs text-textSecondary italic">Jika dipilih, saat Save Invoice jurnal <strong>Debit Biaya → Kredit Hutang Usaha (2110)</strong> akan otomatis ter-posting.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Invoice</button>
          </div>
        </form>
      </Modal>
      
      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="AP Invoice Details" maxWidth="max-w-2xl">
        {editingItem && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 pb-4 border-b border-border">
              <div>
                <p className="text-sm text-textSecondary">Invoice No.</p>
                <p className="font-bold font-mono text-primary text-lg">{editingItem.invoice_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-textSecondary">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mt-1 ${
                  editingItem.status === 'Paid' ? 'bg-success/10 text-success' : 
                  editingItem.status === 'Partial' ? 'bg-warning/10 text-warning' : 
                  'bg-danger/10 text-danger'
                }`}>
                  {editingItem.status}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Vendor</p>
                <p className="font-medium text-textPrimary">{vendors.find(v => v.id === editingItem.vendor_id)?.name || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Project</p>
                <p className="font-medium text-textPrimary">{projects.find(p => p.id === editingItem.project_id)?.name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Invoice Date</p>
                <p className="font-medium text-textPrimary">{editingItem.date}</p>
              </div>
            </div>


            {editingItem.project_rab_id && (
              <div className="p-3 bg-secondary/10 border border-border rounded-lg text-xs">
                <span className="font-semibold text-textSecondary">Pos RAB Terkait: </span>
                <span className="text-primary font-bold">{rabItems.find(r => r.id === editingItem.project_rab_id)?.category} → {rabItems.find(r => r.id === editingItem.project_rab_id)?.description}</span>
              </div>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-textSecondary uppercase bg-background border-b border-border">
                  <tr>
                    <th className="px-4 py-2">Item / Description</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {editingItem.lines && editingItem.lines.length > 0 ? (
                    editingItem.lines.map((l: any, i: number) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-4 py-2 text-textPrimary">{l.description}</td>
                        <td className="px-4 py-2 text-right text-textPrimary">{l.quantity}</td>
                        <td className="px-4 py-2 text-right text-textPrimary">{formatCurrency(l.unit_price)}</td>
                        <td className="px-4 py-2 text-right font-medium text-textPrimary">{formatCurrency(l.total_price)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-center text-textSecondary">No line item breakdown. Total based on header.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Subtotal</span>
                  <span className="font-medium text-textPrimary">{formatCurrency(editingItem.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Tax</span>
                  <span className="font-medium text-textPrimary">{formatCurrency(editingItem.tax_amount || 0)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                  <span className="text-textPrimary">Total Invoice</span>
                  <span className="text-primary">{formatCurrency(editingItem.total_amount)}</span>
                </div>
                
                <div className="flex justify-between text-sm pt-4">
                  <span className="text-textSecondary">Amount Paid</span>
                  <span className="font-medium text-success">{formatCurrency(editingItem.amount_paid || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-primary/20 mt-2">
                  <span className="font-bold text-textPrimary">Balance Due</span>
                  <span className="font-bold text-danger">{formatCurrency(editingItem.total_amount - (editingItem.amount_paid || 0))}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <button type="button" onClick={() => setIsViewOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Processing Modal */}
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Process Bill Payment & Auto-Journal" maxWidth="max-w-lg">
        <form onSubmit={processPayment} className="space-y-4 py-2">
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mb-4">
            <h4 className="font-bold text-primary mb-1">Bill {editingItem?.invoice_number}</h4>
            <div className="flex justify-between text-sm"><span>Base Amount:</span><span>{formatCurrency(editingItem?.amount || 0)}</span></div>
            <div className="flex justify-between text-sm"><span>Tax Amount:</span><span>{formatCurrency(editingItem?.tax_amount || 0)}</span></div>
            <div className="flex justify-between font-bold mt-2 pt-2 border-t border-primary/20"><span>Total to Pay:</span><span className="text-danger">{formatCurrency(editingItem?.total_amount || 0)}</span></div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Pay From (Kredit Kas/Bank) <span className="text-danger">*</span></label>
            <CoaSelect
              required
              accounts={bankAccounts}
              value={paymentData.bank_account_id}
              onChange={(val) => setPaymentData({ ...paymentData, bank_account_id: val })}
              placeholder="-- Pilih Akun Bank/Kas Pembayar --"
            />
          </div>

          {/* Info: Payment will auto-debit Hutang Usaha (2110) */}
          <div className="bg-success/5 border border-success/20 rounded-lg p-3 text-xs text-textSecondary">
            <p className="font-semibold text-success mb-1">📋 Alur Jurnal Otomatis Pembayaran:</p>
            <p><strong>Debit:</strong> 2110 - Hutang Usaha (AP) → mengurangi hutang ke vendor</p>
            <p><strong>Kredit:</strong> Bank yang Anda pilih → kas/bank berkurang</p>
            <p className="mt-1 text-warning">Pastikan sudah ada Jurnal Pengakuan Hutang (dibuat otomatis saat Save Invoice).</p>
          </div>

          <div className="space-y-1.5 mt-2">
            <label className="text-sm font-medium text-textPrimary">Amount to Pay (Partial/Full)</label>
            <input type="text" required value={formatNumber(paymentData.amount_paid)} onChange={e => handleNumberChange(e.target.value, val => setPaymentData({...paymentData, amount_paid: val}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-bold" />
            <p className="text-xs text-textSecondary">Total Invoice: {formatCurrency(editingItem?.total_amount || 0)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-card border border-border rounded-lg">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Bank Admin Fee (Rp)</label>
              <input type="text" value={formatNumber(paymentData.admin_fee)} onChange={e => handleNumberChange(e.target.value, val => setPaymentData({...paymentData, admin_fee: val}))} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary text-right" placeholder="e.g. 2.500"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Admin Fee Account</label>
              <CoaSelect
                required={paymentData.admin_fee > 0}
                accounts={expAccounts}
                value={paymentData.admin_fee_account_id}
                onChange={(val) => setPaymentData({ ...paymentData, admin_fee_account_id: val })}
                placeholder="-- Pilih Akun Biaya Admin --"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border mt-6">
            <div className="text-sm">
              <span className="text-textSecondary">Total Deducted from Bank: </span>
              <span className="font-bold text-danger">{formatCurrency(Number(paymentData.amount_paid || 0) + Number(paymentData.admin_fee || 0))}</span>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsPaymentOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 text-textPrimary">Cancel</button>
              <button type="submit" disabled={_isSaving} className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90">Confirm Payment</button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Confirmation" maxWidth="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger"><AlertTriangle className="w-6 h-6" /></div>
          <div><h3 className="text-lg font-bold text-textPrimary">Are you sure?</h3><p className="text-sm text-textSecondary mt-1">You are about to delete <span className="font-bold text-textPrimary">{editingItem?.invoice_number}</span>. This action cannot be undone.</p></div>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors">Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
