import { useState, useEffect } from 'react';
import { DataTable } from '../../../components/ui/DataTable';
import { Modal } from '../../../components/ui/Modal';
import { CoaSelect } from '../../../components/ui/CoaSelect';
import { DatePicker } from '../../../components/ui/DatePicker';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, stakeholdersApi, projectsApi, financialsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import { generatePaymentReceiptPDF } from '../utils/paymentReceiptPDF';

interface Customer {
  id: string;
  name: string;
  code: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

interface ArInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  project_id?: string;
  po_number?: string;
  date: string;
  due_date: string;
  description: string;
  milestone?: string;
  unit?: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
}

export function ArInvoicePage() {
  const [invoices, setInvoices] = useState<ArInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [_isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ArInvoice | null>(null);
  const [coas, setCoas] = useState<any[]>([]);
  
  // Tax Calculator State
  const [taxRate, setTaxRate] = useState<number>(12); // Default to latest PPN 12%
  
  const [paymentData, setPaymentData] = useState({ bank_account_id: '', revenue_account_id: '', tax_account_id: '' });

  const [formData, setFormData] = useState<Omit<ArInvoice, 'id' | 'created_at'>>({
    invoice_number: '', customer_id: '', project_id: '', po_number: '', date: '', due_date: '', description: '', milestone: 'Field preparation', unit: 'Lump Sump', amount: 0, tax_amount: 0, total_amount: 0, status: 'Unpaid'
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [invRes, custRes, projRes, coasRes] = await Promise.all([
        financeApi.getArInvoices(),
        stakeholdersApi.getCustomers(),
        projectsApi.getProjects(),
        financialsApi.getCoas()
      ]);
      setInvoices(invRes.data);
      setCustomers(custRes.data);
      setProjects(projRes.data);
      const sortedCoas = [...coasRes.data].sort((a: any, b: any) => {
        const codeA = String(a.account_code || a.code || '');
        const codeB = String(b.account_code || b.code || '');
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setCoas(sortedCoas);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addToast('error', 'Connection Error', 'Failed to fetch AR data.');
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

  const columns = [
    { header: 'Invoice No', accessor: 'invoice_number' as keyof ArInvoice, className: 'font-mono text-primary font-bold' },
    { 
      header: 'Customer', 
      accessor: (row: ArInvoice) => {
        const customer = customers.find(c => c.id === row.customer_id);
        return customer ? customer.name : 'Unknown';
      } 
    },
    { 
      header: 'Project', 
      accessor: (row: ArInvoice) => {
        if (!row.project_id) return '-';
        const project = projects.find(p => p.id === row.project_id);
        return project ? project.name : 'Unknown';
      },
      className: 'text-textSecondary'
    },
    { header: 'Date', accessor: 'date' as keyof ArInvoice },
    { 
      header: 'Total Amount', 
      accessor: (row: ArInvoice) => formatCurrency(row.total_amount),
      className: 'text-right font-medium text-primary'
    },
    { 
      header: 'Status & Action', 
      accessor: (row: ArInvoice) => (
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
          <button
            onClick={() => {
              const selectedProj = projects.find(p => p.id === row.project_id);
              const selectedCust = customers.find(c => c.id === row.customer_id);

              // Calculate previous invoices for the same project
              const projectInvoices = row.project_id ? invoices.filter(inv => inv.project_id === row.project_id) : [];
              const prevInvoices = projectInvoices.filter(inv => 
                inv.id !== row.id && 
                inv.invoice_number !== row.invoice_number &&
                (inv.status === 'Paid' || new Date(inv.date).getTime() < new Date(row.date).getTime())
              );
              const prevBilledTotal = prevInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || Number(inv.amount) || 0), 0);
              const prevInvoiceNum = prevInvoices.map(inv => inv.invoice_number).filter(Boolean).join(', ');
              const contractVal = Number((selectedProj as any)?.contract_value_idr) || Number((selectedProj as any)?.contract_value) || 0;
              const totalContract = contractVal > 0 ? contractVal : (prevBilledTotal + (Number(row.total_amount) || Number(row.amount) || 0));

              import('../utils/billingInvoicePDF').then(m => {
                m.generateExactCoreterraInvoicePDF({
                  invoiceNumber: row.invoice_number,
                  invoiceDate: new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
                  customerName: selectedCust?.name || 'PT Volta Indo Technology',
                  customerAddress: (selectedCust as any)?.address || '',
                  customerNpwp: (selectedCust as any)?.tax_id || '',
                  customerEmail: (selectedCust as any)?.email || '',
                  projectName: selectedProj?.name || 'Studi Geolistrik Pembangkit Listrik Tenaga Minihidro (PLTM) Pongkor',
                  poNumber: row.po_number || (selectedProj?.code ? `KONTRAK/${selectedProj.code}` : row.invoice_number),
                  itemDescription: row.description || 'Progres Pekerjaan Lapangan',
                  milestone: row.milestone || 'Field preparation',
                  unit: row.unit || 'Lump Sump',
                  amount: Number(row.total_amount) || Number(row.amount) || 21090000,
                  prevBilledTotal: prevBilledTotal,
                  prevInvoiceNum: prevInvoiceNum,
                  totalContract: totalContract
                });
              });
            }}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors shadow-sm font-semibold flex items-center gap-1"
            title="Download PDF Format 1 (Standard Coreterra)"
          >
            PDF 1
          </button>
          <button
            onClick={() => {
              const selectedProj = projects.find(p => p.id === row.project_id);
              const selectedCust = customers.find(c => c.id === row.customer_id);

              // Calculate previous invoices for the same project
              const projectInvoices = row.project_id ? invoices.filter(inv => inv.project_id === row.project_id) : [];
              const prevInvoices = projectInvoices.filter(inv => 
                inv.id !== row.id && 
                inv.invoice_number !== row.invoice_number &&
                (inv.status === 'Paid' || new Date(inv.date).getTime() < new Date(row.date).getTime())
              );
              const prevBilledTotal = prevInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || Number(inv.amount) || 0), 0);
              const prevInvoiceNum = prevInvoices.map(inv => inv.invoice_number).filter(Boolean).join(', ');
              const contractVal = Number((selectedProj as any)?.contract_value_idr) || Number((selectedProj as any)?.contract_value) || 0;
              const totalContract = contractVal > 0 ? contractVal : (prevBilledTotal + (Number(row.total_amount) || Number(row.amount) || 0));

              import('../utils/invoiceFormat2PDF').then(m => {
                m.generateFormat2InvoicePDF({
                  invoiceNumber: row.invoice_number,
                  invoiceDate: new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
                  customerName: selectedCust?.name || 'PT Solusi Monitoring Indonesia',
                  customerCode: (selectedCust as any)?.code || 'SMI-2026',
                  customerAddress: (selectedCust as any)?.address || 'Gedung Menara Mulia Lt. 12, Jl. Gatot Subroto Kav. 9-11, Jakarta Selatan 12930',
                  customerNpwp: (selectedCust as any)?.tax_id || '01.234.567.8-012.000',
                  companyName: 'PT CORETERRA GEO ENGINEERING',
                  companyNpwp: '1000 0000 1002 1192',
                  companyAddress: 'Gardenia Estate, Blok A5 No 12 RT 007 RW 014, Ciputat, Kota Tangerang Selatan, Banten 15411',
                  companyBranch: 'Head Office Tangerang Selatan & Jakarta',
                  orderNumber: `ORD-${row.invoice_number.replace(/[^0-9]/g, '').slice(-8) || '004-IKPT-001'}`,
                  contractNumber: row.po_number || (selectedProj?.code ? `KONTRAK/${selectedProj.code}/2026` : 'KONTRAK/004_IKPT-SOLOK-001/2026'),
                  poNumber: row.po_number || (selectedProj?.code ? `PO-${selectedProj.code}` : 'IKPT-SOLOK-2026-08'),
                  activityTitle: row.description || selectedProj?.name || 'Washbore Borpile & Foundation Project, Muara Laboh, West Sumatera',
                  feeAmount: row.amount || (row.total_amount ? Math.round(row.total_amount / 1.11) : 19000000),
                  taxAmount: row.tax_amount || (row.total_amount ? row.total_amount - Math.round(row.total_amount / 1.11) : 2090000),
                  totalAmount: row.total_amount || 21090000,
                  prevBilledTotal: prevBilledTotal,
                  prevInvoiceNum: prevInvoiceNum,
                  totalContractAmount: totalContract,
                  signatoryName: 'Setyo Mardani'
                });
              });
            }}
            className="px-2 py-1 bg-[#294825] text-white text-xs rounded hover:bg-[#1f371c] transition-colors shadow-sm font-semibold flex items-center gap-1"
            title="Download PDF Format 2 (BUMN / Kuitansi Standard)"
          >
            PDF 2
          </button>
          {row.status === 'Paid' && (
            <button
              onClick={() => {
                try {
                  const selectedProj = projects.find(p => p.id === row.project_id);
                  const selectedCust = customers.find(c => c.id === row.customer_id);
                  generatePaymentReceiptPDF({
                    invoiceNumber: row.invoice_number,
                    paymentDate: new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
                    receiptDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
                    customerName: selectedCust?.name || 'PT Solusi Monitoring Indonesia',
                    projectName: selectedProj?.name || 'Washbore Borpile & Foundation Project, Muara Laboh, West Sumatera',
                    poNumber: row.po_number || ((selectedProj as any)?.code ? `PO-${(selectedProj as any).code}` : 'PO-004_IKPT-SOLOK-001'),
                    contractNumber: row.po_number || ((selectedProj as any)?.code ? `KONTRAK/${(selectedProj as any).code}/2026` : 'KONTRAK/004_IKPT-SOLOK-001/2026'),
                    milestone: row.milestone || row.description || 'Uang Muka (DP) - Tahap 2',
                    amount: row.total_amount || 0,
                    signatoryName: 'Setyo Mardani'
                  });
                } catch (err) {
                  console.error('Failed to generate Kwitansi PDF:', err);
                }
              }}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded transition-colors shadow-sm font-semibold flex items-center gap-1 cursor-pointer"
              title="Download Kwitansi / Official Payment Receipt"
            >
              Kwitansi
            </button>
          )}
        </div>
      ),
      className: 'w-64'
    },
  ];

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ 
      invoice_number: `AR-${Date.now().toString().slice(-5)}`, 
      customer_id: '', 
      project_id: '',
      po_number: '',
      date: new Date().toISOString().split('T')[0], 
      due_date: '', 
      description: '', 
      milestone: 'Field preparation',
      unit: 'Lump Sump',
      amount: 0, 
      tax_amount: 0, 
      total_amount: 0, 
      status: 'Unpaid' 
    });
    setIsFormOpen(true);
  };

  const handlePaymentClick = (row: ArInvoice) => {
    if (row.status === 'Paid') {
      addToast('warning', 'Already Paid', 'This invoice is already paid.');
      return;
    }
    setEditingItem(row);
    setIsPaymentOpen(true);
  };

  const handleEdit = (row: ArInvoice) => {
    if (row.status === 'Paid') {
      addToast('warning', 'Action Denied', 'Cannot edit a paid invoice.');
      return;
    }
    setEditingItem(row);
    setFormData({ 
      invoice_number: row.invoice_number, 
      customer_id: row.customer_id, 
      project_id: row.project_id || '',
      po_number: row.po_number || '',
      date: row.date, 
      due_date: row.due_date, 
      description: row.description || '', 
      milestone: row.milestone || 'Field preparation',
      unit: row.unit || 'Lump Sump',
      amount: row.amount, 
      tax_amount: row.tax_amount, 
      total_amount: row.total_amount, 
      status: row.status 
    });
    setIsFormOpen(true);
  };

  const handleViewClick = (row: ArInvoice) => {
    setEditingItem(row);
    setIsViewOpen(true);
  };

  const handleDeleteClick = (row: ArInvoice) => {
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
  }, [formData.amount, taxRate]); // Removed formData.tax_amount from dependencies to prevent loop

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id) {
      addToast('error', 'Validation Error', 'Please select a customer.');
      return;
    }
    
    // Optional project ID, if it's empty string we make it null/undefined
    const payload = { ...formData };
    if (!payload.project_id) {
      delete (payload as any).project_id;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await financeApi.updateArInvoice(editingItem.id, payload);
        addToast('success', 'Invoice Updated', `Invoice ${formData.invoice_number} has been updated.`);
      } else {
        await financeApi.createArInvoice(payload);
        addToast('success', 'Invoice Created', `Invoice ${formData.invoice_number} has been created.`);
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
        await financeApi.deleteArInvoice(editingItem.id);
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
    if (!paymentData.bank_account_id || !paymentData.revenue_account_id) {
      addToast('error', 'Validation Error', 'Bank and Revenue accounts are required.');
      return;
    }
    if (editingItem.tax_amount > 0 && !paymentData.tax_account_id) {
      addToast('error', 'Validation Error', 'Tax account is required since there is tax in this invoice.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Create Auto Journal
      const journalLines = [
        {
          account_id: paymentData.bank_account_id,
          project_id: editingItem.project_id || undefined,
          description: `Payment Received for AR ${editingItem.invoice_number}`,
          debit: editingItem.total_amount,
          credit: 0
        },
        {
          account_id: paymentData.revenue_account_id,
          project_id: editingItem.project_id || undefined,
          description: `Revenue for AR ${editingItem.invoice_number}`,
          debit: 0,
          credit: editingItem.amount
        }
      ];

      if (editingItem.tax_amount > 0) {
        journalLines.push({
          account_id: paymentData.tax_account_id,
          project_id: editingItem.project_id || undefined,
          description: `PPN Out for AR ${editingItem.invoice_number}`,
          debit: 0,
          credit: editingItem.tax_amount
        });
      }

      await financeApi.createJournal({
        journal_number: `JV-REC-${editingItem.invoice_number}`,
        date: new Date().toISOString().split('T')[0],
        description: `Auto-Journal: Payment Receipt for ${editingItem.invoice_number}`,
        status: 'Posted',
        ref_type: 'AR_Invoice_Receipt',
        ref_id: editingItem.id,
        lines: journalLines,
      });

      // 2. Mark Invoice as Paid
      await financeApi.updateArInvoice(editingItem.id, { status: 'Paid' });
      
      addToast('success', 'Payment Processed', 'Payment has been recorded and Journal has been posted automatically.');
      await fetchData();
      setIsPaymentOpen(false);
    } catch (error) {
      console.error(error);
      addToast('error', 'Payment Failed', 'Failed to process payment.');
    } finally {
      setIsSaving(false);
    }
  };

  const bankAccounts = coas.filter(c => c.account_type.toLowerCase() === 'asset');
  const revAccounts = coas.filter(c => c.account_type.toLowerCase() === 'revenue');
  const taxAccounts = coas.filter(c => c.account_type.toLowerCase() === 'liability');

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Accounts Receivable (AR)</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">AR Invoices</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <DataTable
          title="Customer Invoices (AR)"
          description="Manage customer invoices and collections. Receive payments to automatically generate journals."
          columns={columns}
          data={invoices}
          searchPlaceholder="Search invoice no..."
          onAdd={handleAdd}
          onEdit={handleEdit}
          onView={handleViewClick}
          onDelete={handleDeleteClick}
        />
        
        {/* Custom Actions overlay for table - simplified by just rendering a button inside the component if needed, but we rely on onEdit for now. Actually, let's just make onEdit open the payment form if it's unpaid. 
            Wait, I'll just change the text below the table to explain they can Edit to receive payment, OR I can add a custom column.
            For simplicity, I will inject a custom column in the columns definition. */}

      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingItem ? "Edit AR Invoice" : "Add AR Invoice"} maxWidth="max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Invoice No. <span className="text-danger">*</span></label>
              <input required type="text" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Customer <span className="text-danger">*</span></label>
              <select required value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
                <option value="">-- Select Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>
          </div>
          
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Related Project (Optional)</label>
              <select value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
                <option value="">-- None --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">PO / Contract Number (Optional)</label>
              <input type="text" value={formData.po_number || ''} onChange={e => setFormData({...formData, po_number: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. KONTRAK/004_IKPT-SOLOK-001/2026"/>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Item & Payment Terms / Description <span className="text-danger">*</span></label>
            <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Progres Pekerjaan Lapangan / Washbore Borpile"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Milestone / Tahapan Pekerjaan</label>
              <input type="text" list="milestone-suggestions" value={formData.milestone || ''} onChange={e => setFormData({...formData, milestone: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Field preparation"/>
              <datalist id="milestone-suggestions">
                <option value="Field preparation" />
                <option value="Uang Muka (DP 20%)" />
                <option value="Uang Muka (DP 30%)" />
                <option value="Termin 1 (Progres 50%)" />
                <option value="Termin 2 (Progres 75%)" />
                <option value="Pelunasan (100%)" />
                <option value="Retensi (5%)" />
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Unit / Satuan</label>
              <input type="text" list="unit-suggestions" value={formData.unit || ''} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Lump Sump"/>
              <datalist id="unit-suggestions">
                <option value="Lump Sump" />
                <option value="Lot" />
                <option value="Paket" />
                <option value="Unit" />
                <option value="Month" />
                <option value="Bulan" />
                <option value="Titik" />
                <option value="Meter" />
              </datalist>
            </div>
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
                <input type="number" min="0" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm text-textPrimary text-right font-medium"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Tax Amount (PPN)</label>
                <input type="number" min="0" disabled={taxRate >= 0} value={formData.tax_amount} onChange={e => setFormData({...formData, tax_amount: Number(e.target.value)})} className={`w-full px-3 py-2 border rounded-lg text-sm text-right ${taxRate >= 0 ? 'bg-background/50 border-transparent text-textSecondary' : 'bg-card border-border text-textPrimary'}`}/>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-textPrimary">Total Invoice</label>
                <input type="number" disabled value={formData.total_amount} className="w-full px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary font-bold text-right" readOnly/>
              </div>
            </div>
            {taxRate > 0 && (
              <p className="text-xs text-textSecondary mt-2 italic">*Tax amount is auto-calculated based on {taxRate}% PPN regulation.</p>
            )}
          </div>

          <div className="space-y-1.5 w-1/2">
            <label className="text-sm font-medium text-textPrimary">Payment Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary">
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 transition-colors text-textPrimary">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"><Save className="w-4 h-4" /> Save Invoice</button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="AR Invoice Details" maxWidth="max-w-2xl">
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
                <p className="text-sm text-textSecondary">Customer</p>
                <p className="font-medium text-textPrimary">{customers.find(c => c.id === editingItem.customer_id)?.name || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Project</p>
                <p className="font-medium text-textPrimary">{projects.find(p => p.id === editingItem.project_id)?.name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Invoice Date</p>
                <p className="font-medium text-textPrimary">{editingItem.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Due Date</p>
                <p className="font-medium text-textPrimary">{editingItem.due_date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">PO / Contract No.</p>
                <p className="font-medium text-textPrimary font-mono">{editingItem.po_number || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Milestone</p>
                <p className="font-medium text-textPrimary">{editingItem.milestone || 'Field preparation'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-textSecondary">Unit / Satuan</p>
                <p className="font-medium text-textPrimary">{editingItem.unit || 'Lump Sump'}</p>
              </div>
            </div>
            
            {editingItem.description && (
              <div>
                <p className="text-sm text-textSecondary mb-1">Item & Payment Terms / Description</p>
                <p className="text-sm text-textPrimary p-3 bg-background border border-border rounded-lg">{editingItem.description}</p>
              </div>
            )}
            
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h4 className="font-bold text-primary mb-3">Financial Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Base Amount (DPP)</span>
                  <span className="font-medium text-textPrimary">{formatCurrency(editingItem.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-textSecondary">Tax Amount (PPN)</span>
                  <span className="font-medium text-textPrimary">{formatCurrency(editingItem.tax_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-primary/20 mt-2">
                  <span className="font-bold text-textPrimary">Total Invoice</span>
                  <span className="font-bold text-primary">{formatCurrency(editingItem.total_amount)}</span>
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
      <Modal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Process Payment & Auto-Journal" maxWidth="max-w-lg">
        <form onSubmit={processPayment} className="space-y-4 py-2">
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 mb-4">
            <h4 className="font-bold text-primary mb-1">Invoice {editingItem?.invoice_number}</h4>
            <div className="flex justify-between text-sm"><span>Base Amount:</span><span>{formatCurrency(editingItem?.amount || 0)}</span></div>
            <div className="flex justify-between text-sm"><span>Tax Amount:</span><span>{formatCurrency(editingItem?.tax_amount || 0)}</span></div>
            <div className="flex justify-between font-bold mt-2 pt-2 border-t border-primary/20"><span>Total to Receive:</span><span className="text-success">{formatCurrency(editingItem?.total_amount || 0)}</span></div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Deposit To (Debit Kas/Bank) <span className="text-danger">*</span></label>
            <CoaSelect
              required
              accounts={bankAccounts}
              value={paymentData.bank_account_id}
              onChange={(val) => setPaymentData({ ...paymentData, bank_account_id: val })}
              placeholder="-- Pilih Akun Bank/Kas Penerima --"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-textPrimary">Revenue Account (Kredit Pendapatan) <span className="text-danger">*</span></label>
            <CoaSelect
              required
              accounts={revAccounts}
              value={paymentData.revenue_account_id}
              onChange={(val) => setPaymentData({ ...paymentData, revenue_account_id: val })}
              placeholder="-- Pilih Akun Pendapatan --"
            />
          </div>

          {(editingItem?.tax_amount || 0) > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-textPrimary">Tax Account (Kredit Hutang PPN) <span className="text-danger">*</span></label>
              <CoaSelect
                required
                accounts={taxAccounts}
                value={paymentData.tax_account_id}
                onChange={(val) => setPaymentData({ ...paymentData, tax_account_id: val })}
                placeholder="-- Pilih Akun Hutang Pajak --"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={() => setIsPaymentOpen(false)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-border/50 text-textPrimary">Cancel</button>
            <button type="submit" disabled={_isSaving} className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90">Confirm Payment</button>
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
