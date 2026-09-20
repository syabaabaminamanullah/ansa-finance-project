import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, CheckCircle, Clock, Check, Building2, Truck, ShoppingCart, Trash2, Eye, Printer, X, ArrowLeft, Percent, Calculator, Pencil, RotateCcw, AlertCircle, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { procurementApi, stakeholdersApi, projectsApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import {
  generatePurchaseOrderPDF,
  formatIDRCurrency,
  terbilangRupiah
} from '../utils/purchaseOrderPDF';
import {
  getCompanySettings,
  LOGO_CORETERRA_BASE64,
  CAP_CORETERRA_BASE64,
  TTD_SETYO_BASE64,
} from '../utils/billingInvoicePDF';
import {
  PremiumCategorySelect,
  PremiumPaymentTermsSelect,
  PremiumDatePicker,
  SmartNotesEditor,
  FormattedTermsDisplay,
  PremiumProjectSelect,
  PremiumVendorSelect,
} from '../components/PurchaseOrderFormControls';

interface POItem {
  id?: string;
  item_code?: string;
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_price: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_code?: string;
  vendor_address?: string;
  vendor_contact?: string;
  vendor_phone?: string;
  vendor_npwp?: string;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  category?: string;
  payment_terms?: string;
  due_date?: string;
  account_id?: string;
  account_code?: string;
  account_name?: string;
  date: string;
  status: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  items: POItem[];
  ap_invoice_id?: string;
  journal_id?: string;
  ap_invoice_number?: string;
  ap_status?: string; // Unpaid, Partial, Paid
  amount_paid?: number;
}

const formatCurrency = (val: number) => formatIDRCurrency(val);

/**
 * Standar Penomoran Otomatis PO Sesuai Sistem Transaksi & Jurnal:
 * Format: CGE-PO-YYMM-XXXX (Contoh: CGE-PO-2609-0010)
 * - CGE  : Penanda dokumen resmi dikeluarkan oleh PT Coreterra Geo Engineering
 * - PO   : Kode dokumen Purchase Order
 * - 26   : 2 digit tahun berjalan (YY)
 * - 09   : 2 digit bulan berjalan (MM)
 * - 0010 : 4 digit nomor urut sekuensial dokumen PO yang sudah dibuat
 */
export function generatePONumber(dateStr: string, existingPos: { po_number: string }[] = []): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  const fullYear = isNaN(date.getFullYear()) ? new Date().getFullYear() : date.getFullYear();
  const monthNum = isNaN(date.getMonth()) ? new Date().getMonth() + 1 : date.getMonth() + 1;
  const yy = String(fullYear).slice(-2);
  const mm = String(monthNum).padStart(2, '0');
  const prefix = `CGE-PO-${yy}${mm}-`;

  let maxSeq = 0;
  for (const p of existingPos) {
    if (p.po_number && (p.po_number.startsWith(prefix) || p.po_number.startsWith(`PO-${yy}${mm}-`))) {
      const parts = p.po_number.split('-');
      const seq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}

// Backward compatibility helper
export const generateStructuredPONumber = (existingPos: any[], dateStr: string) => generatePONumber(dateStr, existingPos);

export function PurchaseOrderPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [unapproveConfirmPo, setUnapproveConfirmPo] = useState<PurchaseOrder | null>(null);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);

  const [newPo, setNewPo] = useState<Partial<PurchaseOrder>>({
    po_number: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    subtotal: 0,
    tax_rate: 0,
    tax_amount: 0,
    total_amount: 0,
    items: [{ item_code: '', description: '', quantity: 1, unit: 'Btg', unit_price: 0, total_price: 0 }]
  });

  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [posRes, vendorsRes, projectsRes] = await Promise.all([
        procurementApi.getPurchaseOrders(),
        stakeholdersApi.getVendors(),
        projectsApi.getProjects()
      ]);
      setPos(posRes.data);
      setVendors(vendorsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching PO data:', error);
      addToast('error', 'Fetch Error', 'Failed to fetch Purchase Orders.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Create PO Modal with freshly generated corporate PO Number (PO-YYMM-XXXX)
  const handleOpenCreateModal = async () => {
    setEditingPoId(null);
    const today = new Date().toISOString().split('T')[0];
    
    // Default jatuh tempo 30 hari ke depan
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const defaultDueDate = d.toISOString().split('T')[0];

    // Ambil nomor PO otomatis dari backend, fallback ke generator lokal
    let initialPoNumber = generatePONumber(today, pos);
    try {
      const res = await procurementApi.getNextPoNumber(today);
      if (res.data?.po_number) {
        initialPoNumber = res.data.po_number;
      }
    } catch (e) {
      console.warn('Fallback to local PO number generator:', e);
    }

    setNewPo({
      po_number: initialPoNumber,
      date: today,
      category: 'Jasa Subkontraktor',
      payment_terms: 'Net 30 Hari',
      due_date: defaultDueDate,
      status: 'Draft',
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 0,
      items: [{ item_code: '', description: '', quantity: 1, unit: 'Btg', unit_price: 0, total_price: 0 }]
    });
    setIsModalOpen(true);
  };

  // Open Edit PO Modal populated with existing PO data
  const handleOpenEditModal = (po: PurchaseOrder) => {
    setEditingPoId(po.id);
    const subtotal = po.subtotal ?? (po.total_amount - (po.tax_amount ?? 0));
    const taxRate = po.tax_rate ?? 0;
    const taxAmount = po.tax_amount ?? (subtotal * (taxRate / 100));
    const grandTotal = po.total_amount || (subtotal + taxAmount);

    setNewPo({
      po_number: po.po_number,
      vendor_id: po.vendor_id,
      project_id: po.project_id || '',
      category: po.category || 'Jasa Subkontraktor',
      payment_terms: po.payment_terms || 'Net 30 Hari',
      due_date: po.due_date || '',
      account_id: po.account_id || '',
      date: po.date,
      status: po.status,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: grandTotal,
      notes: po.notes || '',
      items: (po.items && po.items.length > 0)
        ? po.items.map(it => ({
            id: it.id,
            item_code: it.item_code || '',
            description: it.description || '',
            quantity: it.quantity || 1,
            unit: it.unit || 'Btg',
            unit_price: it.unit_price || 0,
            total_price: it.total_price || 0
          }))
        : [{ item_code: '', description: '', quantity: 1, unit: 'Btg', unit_price: 0, total_price: 0 }]
    });
    setIsModalOpen(true);
  };

  const handlePaymentTermsChange = (terms: string) => {
    let days = 30;
    if (terms.includes('7')) days = 7;
    else if (terms.includes('14')) days = 14;
    else if (terms.includes('COD') || terms.includes('Cash') || terms.includes('Tunai')) days = 0;

    const baseDate = newPo.date ? new Date(newPo.date) : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    const calculatedDueDate = baseDate.toISOString().split('T')[0];

    setNewPo(prev => ({
      ...prev,
      payment_terms: terms,
      due_date: calculatedDueDate
    }));
  };

  const handleProjectChange = (projectId: string) => {
    setNewPo(prev => ({
      ...prev,
      project_id: projectId
    }));
  };

  const handleDateChange = async (dateVal: string) => {
    if (!editingPoId) {
      let updatedPoNumber = generatePONumber(dateVal, pos);
      try {
        const res = await procurementApi.getNextPoNumber(dateVal);
        if (res.data?.po_number) {
          updatedPoNumber = res.data.po_number;
        }
      } catch (e) {
        // fallback to local generator
      }

      setNewPo(prev => ({
        ...prev,
        date: dateVal,
        po_number: updatedPoNumber
      }));
    } else {
      setNewPo(prev => ({
        ...prev,
        date: dateVal
      }));
    }
  };

  const handleTaxRateChange = (rateVal: number) => {
    const subtotal = newPo.items ? newPo.items.reduce((sum, item) => sum + (item.total_price || 0), 0) : 0;
    const taxAmount = Math.round(subtotal * (rateVal / 100) * 100) / 100;
    const grandTotal = subtotal + taxAmount;

    setNewPo(prev => ({
      ...prev,
      subtotal,
      tax_rate: rateVal,
      tax_amount: taxAmount,
      total_amount: grandTotal
    }));
  };

  const handleSavePO = async () => {
    try {
      if (!newPo.vendor_id || !newPo.items || newPo.items.length === 0) {
        addToast('warning', 'Validasi', 'Silakan pilih vendor dan isi minimal satu item barang.');
        return;
      }

      if (editingPoId) {
        // Mode Edit: Update existing PO
        const res = await procurementApi.updatePurchaseOrder(editingPoId, newPo);
        setPos(pos.map(p => p.id === editingPoId ? res.data : p));
        if (selectedPo?.id === editingPoId) {
          setSelectedPo(res.data);
        }
        setIsModalOpen(false);
        setEditingPoId(null);
        addToast('success', 'PO Berhasil Diperbarui', `Perubahan Purchase Order ${res.data.po_number} berhasil disimpan ke database.`);
      } else {
        // Mode Create: Create new PO
        const res = await procurementApi.createPurchaseOrder(newPo);
        setPos([res.data, ...pos]);
        setIsModalOpen(false);
        addToast('success', 'PO Berhasil Dibuat', `Purchase Order ${res.data.po_number} berhasil diterbitkan.`);
      }
    } catch (error) {
      addToast('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan Purchase Order ke database.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await procurementApi.deletePurchaseOrder(id);
      setPos(pos.filter(p => p.id !== id));
      if (selectedPo?.id === id) {
        setSelectedPo(null);
      }
      setDeleteConfirmId(null);
      addToast('success', 'Berhasil Dihapus', 'Purchase Order beserta seluruh item dan catatan terkait telah bersih dihapus dari database.');
    } catch (error) {
      addToast('error', 'Hapus Gagal', 'Gagal menghapus Purchase Order dari database.');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await procurementApi.updatePurchaseOrderStatus(id, newStatus);
      await fetchData();
      if (newStatus === 'Approved') {
        addToast('success', 'PO Berhasil Di-Approve', '✅ Jurnal Pengakuan Beban/Aset & Hutang Vendor (AP) otomatis diposting ke General Ledger! Dokumen kini resmi terkunci.');
      } else if (newStatus === 'Draft') {
        addToast('success', 'PO Berhasil Di-Unapprove', '↩️ Jurnal Pengakuan & AP Invoice terkait telah bersih dihapus dari GL. Status PO kembali menjadi Draft dan dapat diedit.');
      } else {
        addToast('success', 'Status Diperbarui', `Status PO diubah ke ${newStatus}.`);
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.detail || 'Gagal memperbarui status PO.';
      addToast('error', 'Gagal Update Status', errMsg);
    }
  };

  const handleTriggerUnapprove = (po: PurchaseOrder) => {
    // Check if already paid
    if ((po.amount_paid && po.amount_paid > 0) || po.ap_status === 'Paid' || po.ap_status === 'Partial') {
      addToast('warning', 'Tidak Dapat Di-Unapprove', `PO ${po.po_number} sudah memiliki pembayaran kas tercatat (${po.ap_status}, Terbayar: ${formatCurrency(po.amount_paid || 0)}). Silakan batalkan/void pembayaran kas terlebih dahulu di menu Keuangan (AP Invoices).`);
      return;
    }
    setUnapproveConfirmPo(po);
  };

  const handleConfirmUnapprove = async () => {
    if (!unapproveConfirmPo) return;
    try {
      await handleUpdateStatus(unapproveConfirmPo.id, 'Draft');
      setUnapproveConfirmPo(null);
    } catch (e) {
      // Error already handled in handleUpdateStatus
    }
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    if (!newPo.items) return;
    const updatedItems = [...newPo.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      const q = updatedItems[index].quantity || 0;
      const p = updatedItems[index].unit_price || 0;
      updatedItems[index].total_price = Math.round(q * p * 100) / 100;
    }

    const subtotal = updatedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const taxRate = newPo.tax_rate || 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const grandTotal = subtotal + taxAmount;

    setNewPo({
      ...newPo,
      items: updatedItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: grandTotal
    });
  };

  const filteredPos = pos.filter(p =>
    (p.po_number && p.po_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.vendor_name && p.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.project_name && p.project_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    if (status === 'Draft') return 'bg-secondary/50 text-textSecondary';
    if (status === 'Approved') return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    if (status === 'Completed') return 'bg-success/10 text-success border border-success/20';
    return 'bg-danger/10 text-danger';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/procurement" className="p-2 bg-card border border-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">Purchase Orders (PO / SPK)</h1>
            <p className="text-textSecondary text-sm">Kelola Surat Pesanan & SPK Subkontraktor — Terintegrasi Otomatis ke Akuntansi</p>
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-card rounded-lg hover:bg-primary/90 transition-colors font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" /> Buat PO Baru
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-textSecondary text-sm font-medium">Total POs</p>
          <p className="text-2xl font-bold text-textPrimary mt-1">{pos.length}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-textSecondary text-sm font-medium">Draft (Off-Balance)</p>
          <p className="text-2xl font-bold text-yellow-500 mt-1">{pos.filter(p => p.status === 'Draft').length}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-textSecondary text-sm font-medium">Approved (Terjurnal & AP)</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{pos.filter(p => p.status === 'Approved' && p.ap_status !== 'Paid').length}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <p className="text-textSecondary text-sm font-medium">Paid / Lunas Penuh</p>
          <p className="text-2xl font-bold text-success mt-1">{pos.filter(p => p.ap_status === 'Paid' || p.status === 'Completed').length}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
          <input
            type="text"
            placeholder="Cari Nomor PO, Vendor, atau Proyek..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-textPrimary focus:outline-none focus:border-primary text-sm"
          />
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 text-textSecondary text-xs uppercase border-b border-border">
                <th className="p-4 font-medium">Nomor PO</th>
                <th className="p-4 font-medium">Vendor / Subcon</th>
                <th className="p-4 font-medium">Proyek</th>
                <th className="p-4 font-medium">Tanggal</th>
                <th className="p-4 font-medium">Total Nilai (IDR)</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Integrasi Akuntansi</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-textSecondary">Memuat data Purchase Order...</td></tr>
              ) : filteredPos.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-textSecondary">Belum ada Purchase Order. Klik tombol "Buat PO Baru" di atas!</td></tr>
              ) : (
                filteredPos.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-semibold text-primary flex items-center gap-1.5 text-xs">
                        <FileText className="w-4 h-4" /> {p.po_number}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold tracking-wide ${
                          p.category?.includes('Aset')
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                            : p.category?.includes('Material')
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : p.category?.includes('Sewa')
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : p.category?.includes('Kantor')
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}>
                          {p.category || 'Jasa Subkontraktor'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-textPrimary">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-textSecondary" />
                        <div>
                          <p className="font-medium text-sm">{p.vendor_name || '-'}</p>
                          {p.vendor_code && <p className="text-xs text-textSecondary font-mono">{p.vendor_code}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-textSecondary text-sm">
                      <p className="font-medium text-textPrimary">{p.project_name || 'General / Operasional'}</p>
                      {p.project_code && <p className="text-xs text-textSecondary font-mono">{p.project_code}</p>}
                    </td>
                    <td className="p-4 text-textSecondary text-sm">
                      <p className="font-medium">{p.date}</p>
                      <p className="text-[11px] text-textSecondary mt-0.5">
                        TOP: <span className="font-semibold text-textPrimary">{p.payment_terms || 'Net 30 Hari'}</span>
                      </p>
                      {p.due_date && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Tempo: {p.due_date}
                        </p>
                      )}
                    </td>
                    <td className="p-4 font-bold text-textPrimary text-sm">{formatCurrency(p.total_amount)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${getStatusColor(p.status)}`}>
                        {p.status === 'Draft' && <Clock className="w-3 h-3" />}
                        {p.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                        {p.status === 'Completed' && <Check className="w-3 h-3" />}
                        {p.status}
                      </span>
                    </td>
                    {/* Integration Status Column */}
                    <td className="p-4">
                      {p.status === 'Approved' || p.status === 'Completed' ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded font-semibold">
                              ✓ Jurnal Terposting
                            </span>
                            {p.ap_status === 'Paid' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-success/15 text-success rounded font-bold">
                                ✓ Lunas (Paid)
                              </span>
                            ) : p.ap_status === 'Partial' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-warning/15 text-warning rounded font-bold">
                                ⏳ Partial ({formatCurrency(p.amount_paid || 0)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-danger/10 text-danger rounded font-semibold">
                                ✓ Hutang AP (Unpaid)
                              </span>
                            )}
                          </div>
                          {p.category?.includes('Aset') ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded font-medium">
                              ✓ Aset Tetap Neraca (CAPEX)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-textSecondary font-mono">
                              Beban: {p.category?.includes('Material') ? '51200 (Material)' : p.category?.includes('Kantor') ? '61700 (Kantor)' : '51100 (Subkon)'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-textSecondary italic flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Persetujuan
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end items-center gap-1.5">
                        {/* View Document */}
                        <button
                          onClick={() => setSelectedPo(p)}
                          title="Lihat Dokumen Preview"
                          className="p-1.5 rounded-lg bg-background border border-border text-textSecondary hover:text-primary hover:border-primary transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Direct PDF Download */}
                        <button
                          onClick={() => generatePurchaseOrderPDF(p)}
                          title="Cetak / Unduh PDF Vektor"
                          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* MODE DRAFT: Bebas Edit, Hapus, dan Tombol Approve */}
                        {p.status === 'Draft' && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              title="Edit Purchase Order"
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/30 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleUpdateStatus(p.id, 'Approved')}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                              title="Approve PO: Otomatis posting Jurnal Beban/Aset & Hutang Vendor (AP) ke Buku Besar"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>

                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              title="Hapus PO"
                              className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* MODE APPROVED: Dokumen Terkunci (Edit & Hapus Hilang). Tombol Unapprove Aktif */}
                        {(p.status === 'Approved' || p.status === 'Completed') && (
                          <>
                            <div className="flex items-center gap-1 text-[11px] text-textSecondary px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-border" title="Dokumen resmi terkunci karena transaksi jurnal sudah aktif">
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Terkunci</span>
                            </div>

                            <button
                              onClick={() => handleTriggerUnapprove(p)}
                              className="px-2.5 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer flex items-center gap-1"
                              title="Unapprove PO: Batalkan persetujuan, hapus Jurnal & AP Invoice bersih dari GL, lalu kembalikan PO ke status Draft"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Unapprove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DOCUMENT MODAL */}
      {selectedPo && (() => {
        const company = getCompanySettings();
        const subtotal = selectedPo.subtotal ?? (selectedPo.total_amount - (selectedPo.tax_amount ?? 0));
        const taxRate = selectedPo.tax_rate ?? 0;
        const taxAmount = selectedPo.tax_amount ?? (subtotal * (taxRate / 100));
        const grandTotal = selectedPo.total_amount || (subtotal + taxAmount);

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-card w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="p-4 border-b border-border flex justify-between items-center bg-background">
                <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Document Preview — {selectedPo.po_number}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generatePurchaseOrderPDF(selectedPo)}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-[#182B49] hover:bg-[#0F1B2E] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Cetak / Export PDF (Vector)
                  </button>
                  <button onClick={() => setSelectedPo(null)} className="p-2 text-textSecondary hover:text-textPrimary">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* PO Document - Procurement Themed Paper */}
              <div className="p-8 overflow-y-auto flex-1 bg-white text-gray-800 font-sans print:p-0">
                {/* Top Amber Accent Line (Corporate Kop Header) */}
                <div className="h-1.5 bg-amber-600 rounded-t mb-5"></div>

                {/* Company Header & PO Box */}
                <div className="flex justify-between items-start border-b border-gray-200 pb-5 mb-5">
                  <div className="flex items-start gap-4">
                    <img
                      src={company.logoBase64 || LOGO_CORETERRA_BASE64}
                      alt="Logo"
                      className="h-12 w-auto object-contain"
                    />
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                        {company.companyName || 'PT CORETERRA GEO ENGINEERING'}
                      </h1>
                      <p className="text-[10px] font-bold text-amber-600 tracking-wider uppercase mt-0.5">
                        Geotechnical • Drilling • Civil Engineering • Mining Consultant
                      </p>
                      <p className="text-xs text-gray-600 mt-1 max-w-md">
                        {company.address || 'Gardenia Estate, Blok A5 No 12, Ciputat, Tangerang Selatan 15412'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Email: {company.email || 'admin.cge@coreterra-geo.com'} | Telp: {company.phone || '+62 812-1494-1641'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="bg-slate-50/80 border border-slate-200 px-4 py-2.5 rounded-lg inline-block text-right">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Purchase Order (PO)</p>
                      <p className="text-lg font-bold text-slate-900 font-mono">{selectedPo.po_number}</p>
                      <p className="text-xs text-slate-600 mt-0.5">Tanggal: {selectedPo.date}</p>
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block
                        ${selectedPo.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          selectedPo.status === 'Approved' ? 'bg-slate-100 text-slate-800' :
                          'bg-slate-100 text-slate-700'}`}>
                        {selectedPo.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2-Column Cards: Issued By (Company) & Issued To (Vendor) */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {/* Issued By (Company Profile) */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-lg p-3.5">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Issued By / Pemesan:
                    </p>
                    <p className="font-bold text-slate-900 text-sm">{company.companyName}</p>
                    <p className="text-xs text-gray-600 mt-1">{company.address}</p>
                    <p className="text-xs text-gray-600 mt-1">Telp/WA: {company.phone}</p>
                    <p className="text-xs text-gray-600">Email: {company.email}</p>
                    {company.taxId && <p className="text-xs text-gray-600">NPWP: {company.taxId}</p>}
                  </div>

                  {/* Issued To / Vendor */}
                  <div className="bg-slate-50/60 border border-slate-200 rounded-lg p-3.5">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Issued To / Vendor:
                    </p>
                    <p className="font-bold text-slate-900 text-sm">{selectedPo.vendor_name || '-'}</p>
                    <p className="text-xs text-gray-600 mt-1">{selectedPo.vendor_address || '-'}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Kontak / Telp: {selectedPo.vendor_phone || selectedPo.vendor_contact || '-'}
                    </p>
                    <p className="text-xs text-gray-600">
                      NPWP: {selectedPo.vendor_npwp || '-'}
                    </p>
                  </div>
                </div>

                {/* Project Reference & Total Card (Natural Executive Card) */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Referensi Proyek</p>
                    <p className="font-semibold text-slate-900 text-sm mt-0.5">
                      {selectedPo.project_name || 'General / Operasional Kantor'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Nilai PO</p>
                    <p className="text-base font-bold text-slate-900">{formatIDRCurrency(grandTotal)}</p>
                  </div>
                </div>

                {/* Items Table with Midnight Slate/Navy Header */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#182B49] text-white">
                        <th className="p-2.5 text-center font-semibold w-10">#</th>
                        <th className="p-2.5 text-center font-semibold w-24">Kode Barang</th>
                        <th className="p-2.5 text-left font-semibold">Deskripsi Pekerjaan / Barang</th>
                        <th className="p-2.5 text-center font-semibold w-16">Qty</th>
                        <th className="p-2.5 text-center font-semibold w-16">Satuan</th>
                        <th className="p-2.5 text-right font-semibold w-32">Harga Satuan (Rp)</th>
                        <th className="p-2.5 text-right font-semibold w-36">Total (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPo.items.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                          <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 text-center font-mono font-semibold text-slate-800 bg-slate-50/60">
                            {item.item_code || '-'}
                          </td>
                          <td className="p-2.5 text-slate-800 font-medium whitespace-pre-line leading-relaxed">{item.description}</td>
                          <td className="p-2.5 text-center text-slate-600">{item.quantity.toLocaleString('id-ID')}</td>
                          <td className="p-2.5 text-center text-slate-600 font-medium">{item.unit || '-'}</td>
                          <td className="p-2.5 text-right text-slate-700">{formatIDRCurrency(item.unit_price)}</td>
                          <td className="p-2.5 text-right font-semibold text-slate-900">{formatIDRCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Terbilang */}
                <div className="grid grid-cols-12 gap-4 mb-6">
                  {/* Left: Terbilang & Notes */}
                  <div className="col-span-7 space-y-3">
                    <div className="bg-slate-50 border-l-4 border-l-[#1E3A5F] p-3 rounded-r border border-slate-200">
                      <p className="text-[10px] font-bold text-[#1E3A5F] uppercase tracking-wider">Terbilang / In Words:</p>
                      <p className="text-xs italic text-slate-800 mt-1 font-medium leading-relaxed">
                        "# {terbilangRupiah(grandTotal)} #"
                      </p>
                    </div>

                    {selectedPo.notes && (
                      <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 shadow-xs">
                        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Catatan & Ketentuan (Terms):</p>
                        <FormattedTermsDisplay text={selectedPo.notes} />
                      </div>
                    )}
                  </div>

                  {/* Right: Summary Breakdown with Tax */}
                  <div className="col-span-5">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal (DPP):</span>
                        <span className="font-semibold text-slate-900">{formatIDRCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>PPN ({taxRate}%):</span>
                        <span className="font-semibold text-slate-900">{formatIDRCurrency(taxAmount)}</span>
                      </div>
                      <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-sm">
                        <span className="text-slate-900">Grand Total:</span>
                        <span className="text-slate-900">{formatIDRCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single Signature Block from Company Profile side only */}
                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <div className="text-center w-64">
                    <p className="text-xs text-slate-600 mb-1">Hormat Kami / Issued by,</p>
                    <p className="text-xs font-bold text-slate-900 mb-2">{company.companyName}</p>
                    
                    {/* Stamp & Signature Images Overlay */}
                    <div className="relative h-18 flex items-center justify-center my-1">
                      <img
                        src={CAP_CORETERRA_BASE64}
                        alt="Cap Perusahaan"
                        className="absolute h-14 w-auto opacity-85 object-contain pointer-events-none -left-2 -top-1"
                      />
                      <img
                        src={TTD_SETYO_BASE64}
                        alt="Tanda Tangan Direktur"
                        className="relative z-10 h-13 w-auto object-contain"
                      />
                    </div>

                    <p className="text-sm font-bold text-slate-900 mt-2">Setyo Mardani</p>
                    <p className="text-xs text-slate-500">Director / Direktur</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-danger" />
            </div>
            <h3 className="text-lg font-bold text-textPrimary mb-2">Hapus Purchase Order?</h3>
            <p className="text-sm text-textSecondary mb-6">
              Tindakan ini tidak bisa dibatalkan. PO ini akan dihapus permanen dari sistem.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 border border-border rounded-lg text-textSecondary hover:bg-background transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2 bg-danger text-white rounded-lg font-medium hover:bg-danger/90 transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNAPPROVE CONFIRM MODAL */}
      {unapproveConfirmPo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-2xl border border-amber-500/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-textPrimary mb-2">
              Batalkan Approval PO (Unapprove)?
            </h3>
            <div className="bg-background/80 rounded-lg p-3 text-xs font-mono mb-4 border border-border space-y-1">
              <div className="flex justify-between">
                <span className="text-textSecondary">Nomor PO:</span>
                <span className="font-bold text-primary">{unapproveConfirmPo.po_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Vendor:</span>
                <span className="font-semibold text-textPrimary">{unapproveConfirmPo.vendor_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textSecondary">Total Nilai:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(unapproveConfirmPo.total_amount || 0)}</span>
              </div>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400 mb-6 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> Konsekuensi Pembatalan Approval:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-textSecondary text-[11px] pl-1">
                <li>Jurnal pengakuan beban & hutang AP otomatis <strong>dihapus bersih</strong> dari buku besar.</li>
                <li>Invoice Hutang (AP) terkait otomatis <strong>dihapus</strong>.</li>
                <li>Status PO kembali menjadi <strong>Draft</strong>, tombol Edit dan Hapus akan terbuka kembali.</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setUnapproveConfirmPo(null)}
                className="flex-1 py-2 border border-border rounded-lg text-textSecondary hover:bg-background transition-colors font-medium text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmUnapprove}
                className="flex-1 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm flex items-center justify-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" /> Ya, Unapprove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PO MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-background">
              <div>
                <h2 className="text-xl font-bold text-textPrimary flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" /> {editingPoId ? 'Edit Purchase Order (PO / SPK)' : 'Penerbitan Purchase Order (PO / SPK)'}
                </h2>
                <p className="text-xs text-textSecondary mt-0.5">
                  {editingPoId ? 'Perbarui data PO, rincian barang, atau pajak — perubahan langsung tersimpan ke database' : 'Nomor dokumen otomatis dibuat oleh sistem (CGE-PO-YYMM-XXXX) seperti penomoran jurnal transaksi'}
                </p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingPoId(null); }} className="text-textSecondary hover:text-textPrimary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Nomor PO (Otomatis Sistem) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPo.po_number || ''}
                    onChange={(e) => setNewPo({...newPo, po_number: e.target.value})}
                    placeholder="CGE-PO-2609-0010"
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-textPrimary font-mono font-semibold focus:outline-none focus:border-primary text-sm"
                  />
                  <p className="text-[11px] text-textSecondary mt-1">
                    Format: <span className="font-mono font-bold text-primary">CGE-PO-YYMM-XXXX</span> (Contoh: <span className="font-mono font-semibold text-textPrimary">CGE-PO-2609-0010</span>) • Penanda CGE
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Tanggal Terbit <span className="text-danger">*</span>
                  </label>
                  <PremiumDatePicker
                    value={newPo.date || ''}
                    onChange={(val) => handleDateChange(val)}
                    placeholder="Pilih Tanggal Terbit..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Proyek Alokasi Biaya
                  </label>
                  <PremiumProjectSelect
                    projects={projects}
                    value={newPo.project_id || ''}
                    onChange={(id) => handleProjectChange(id)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                  Vendor / Rekanan Pengadaan <span className="text-danger">*</span>
                </label>
                <PremiumVendorSelect
                  vendors={vendors}
                  value={newPo.vendor_id || ''}
                  onChange={(id) => setNewPo({...newPo, vendor_id: id})}
                />
              </div>

              {/* Classification, Terms of Payment, and Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Klasifikasi / Tipe Pengadaan <span className="text-danger">*</span>
                  </label>
                  <PremiumCategorySelect
                    value={newPo.category || 'Jasa Subkontraktor'}
                    onChange={(cat) => setNewPo({...newPo, category: cat})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Syarat Pembayaran (TOP) <span className="text-danger">*</span>
                  </label>
                  <PremiumPaymentTermsSelect
                    value={newPo.payment_terms || 'Net 30 Hari (1 Bulan)'}
                    onChange={(terms) => handlePaymentTermsChange(terms)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider mb-1">
                    Tanggal Jatuh Tempo Pembayaran
                  </label>
                  <PremiumDatePicker
                    value={newPo.due_date || ''}
                    onChange={(val) => setNewPo({...newPo, due_date: val})}
                    placeholder="Pilih Jatuh Tempo..."
                    quickPresets={true}
                  />
                  <p className="text-[11px] text-textSecondary mt-1">
                    Masuk ke laporan Umur Hutang (AP Aging).
                  </p>
                </div>
              </div>

              {/* Smart Accounting Insight Alert Box */}
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                newPo.category?.includes('Aset')
                  ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                  : newPo.category?.includes('Material')
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : newPo.category?.includes('Kantor')
                  ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              }`}>
                <div className="font-bold text-sm mt-0.5">ℹ️</div>
                <div>
                  <span className="font-bold">
                    {newPo.category?.includes('Aset')
                      ? 'Perlakuan Akuntansi: Kapitalisasi Aset Tetap (CAPEX - Balance Sheet)'
                      : newPo.category?.includes('Material')
                      ? 'Perlakuan Akuntansi: Beban Langsung Material Proyek (COGS)'
                      : newPo.category?.includes('Kantor')
                      ? 'Perlakuan Akuntansi: Beban Operasional Kantor (OPEX Overhead)'
                      : 'Perlakuan Akuntansi: Beban Jasa Subkontraktor Proyek (COGS)'}
                  </span>
                  <p className="mt-0.5 opacity-90 leading-relaxed">
                    {newPo.category?.includes('Aset')
                      ? 'Nilai pengadaan ini TIDAK akan membebani biaya habis pakai proyek, melainkan dicatat sebagai Aset Tetap di Neraca dan disusutkan secara bertahap lewat akumulasi depresiasi.'
                      : newPo.category?.includes('Material')
                      ? 'Material besi, semen, atau perlengkapan ini diperlakukan sebagai bahan habis pakai yang langsung memotong anggaran RAB Material proyek bersangkutan.'
                      : newPo.category?.includes('Kantor')
                      ? 'Pengadaan operasional umum kantor tidak akan membebani anggaran RAB proyek konstruksi.'
                      : 'Jasa subkon rebar/drilling akan langsung dialokasikan ke RAB Proyek (Akun 51100) dan menjadi tagihan Hutang Usaha (AP) saat status Completed.'}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-textPrimary">
                    Rincian Barang & Jasa Pengadaan
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPo({
                      ...newPo,
                      items: [...(newPo.items || []), { item_code: '', description: '', quantity: 1, unit: 'Btg', unit_price: 0, total_price: 0 }]
                    })}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris Barang
                  </button>
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-background">
                      <tr className="border-b border-border text-textSecondary">
                        <th className="p-2.5 text-left font-semibold w-28">Kode Barang</th>
                        <th className="p-2.5 text-left font-semibold">Deskripsi Barang / Jasa</th>
                        <th className="p-2.5 text-left font-semibold w-20">Qty</th>
                        <th className="p-2.5 text-left font-semibold w-24">Satuan</th>
                        <th className="p-2.5 text-left font-semibold w-36">Harga Satuan (Rp)</th>
                        <th className="p-2.5 text-right font-semibold w-36">Total (Rp)</th>
                        <th className="p-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {newPo.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              value={item.item_code || ''}
                              placeholder="e.g. BSI-U16"
                              onChange={(e) => updateItem(idx, 'item_code', e.target.value)}
                              className="w-full p-2 bg-background border border-border rounded text-textPrimary focus:outline-none focus:border-primary text-xs font-mono font-semibold"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <textarea
                              rows={2}
                              value={item.description}
                              placeholder="e.g. Jasa Pembuatan Rebar Besi Beton Ulir 16 LS&#10;(Bisa tekan Enter untuk baris baru / spesifikasi rinci)"
                              onChange={(e) => updateItem(idx, 'description', e.target.value)}
                              className="w-full p-2 bg-background border border-border rounded text-textPrimary focus:outline-none focus:border-primary text-xs resize-y min-h-[58px] leading-relaxed"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 bg-background border border-border rounded text-textPrimary focus:outline-none focus:border-primary text-xs"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              list="units-list"
                              value={item.unit || ''}
                              placeholder="Btg/Pcs"
                              onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                              className="w-full p-2 bg-background border border-border rounded text-textPrimary focus:outline-none focus:border-primary text-xs text-center"
                            />
                            <datalist id="units-list">
                              <option value="Btg" />
                              <option value="Kg" />
                              <option value="M'" />
                              <option value="M3" />
                              <option value="Ls" />
                              <option value="Zak" />
                              <option value="Pcs" />
                              <option value="Unit" />
                              <option value="Roll" />
                              <option value="Hari" />
                              <option value="Bulan" />
                            </datalist>
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full p-2 bg-background border border-border rounded text-textPrimary focus:outline-none focus:border-primary text-xs text-right font-mono"
                            />
                          </td>
                          <td className="p-2 align-top pt-3.5 font-mono font-semibold text-textPrimary text-right text-xs">
                            {formatCurrency(item.total_price)}
                          </td>
                          <td className="p-2 align-top pt-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newPo.items!.filter((_, i) => i !== idx);
                                const subtotal = updated.reduce((s, i) => s + (i.total_price || 0), 0);
                                const taxRate = newPo.tax_rate || 0;
                                const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
                                setNewPo({
                                  ...newPo,
                                  items: updated,
                                  subtotal,
                                  tax_amount: taxAmount,
                                  total_amount: subtotal + taxAmount
                                });
                              }}
                              className="text-danger hover:text-danger/70 font-bold text-base"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary & Tax Calculation Breakdown */}
                  <div className="p-4 bg-background border-t border-border space-y-2">
                    <div className="flex justify-end items-center gap-6 text-xs">
                      <span className="text-textSecondary">Subtotal (DPP):</span>
                      <span className="font-mono font-bold text-textPrimary w-40 text-right">
                        {formatCurrency(newPo.subtotal || 0)}
                      </span>
                    </div>

                    <div className="flex justify-end items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-textSecondary flex items-center gap-1">
                          <Percent className="w-3.5 h-3.5 text-primary" /> Pajak PPN:
                        </span>
                        <select
                          value={newPo.tax_rate || 0}
                          onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                          className="p-1 bg-card border border-border rounded text-textPrimary text-xs focus:outline-none focus:border-primary"
                        >
                          <option value="0">Non-PPN (0%)</option>
                          <option value="11">PPN 11% (Standar)</option>
                          <option value="1.1">PPN 1.1% (Besar Final)</option>
                        </select>
                      </div>
                      <span className="font-mono font-semibold text-textSecondary w-40 text-right">
                        {formatCurrency(newPo.tax_amount || 0)}
                      </span>
                    </div>

                    <div className="flex justify-end items-center gap-6 border-t border-border pt-2 text-sm">
                      <span className="font-bold text-textPrimary">Grand Total PO:</span>
                      <span className="font-mono font-bold text-primary text-base w-40 text-right">
                        {formatCurrency(newPo.total_amount || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <SmartNotesEditor
                  value={newPo.notes || ''}
                  onChange={(val) => setNewPo({...newPo, notes: val})}
                  category={newPo.category}
                  items={newPo.items}
                  vendorName={vendors.find(v => v.id === newPo.vendor_id)?.name}
                  projectName={projects.find(p => p.id === newPo.project_id)?.name}
                  poDate={newPo.date}
                  dueDate={newPo.due_date}
                  paymentTerms={newPo.payment_terms}
                />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-background flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingPoId(null); }}
                className="px-4 py-2 text-textSecondary hover:text-textPrimary font-medium text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePO}
                className="px-6 py-2 bg-primary text-card rounded-lg font-semibold hover:bg-primary/90 flex items-center gap-2 text-sm shadow cursor-pointer"
              >
                <Check className="w-4 h-4" /> {editingPoId ? 'Simpan Perubahan PO' : 'Terbitkan Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
