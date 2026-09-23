import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Plus, FileText, ChevronDown, ChevronRight,
  CheckCircle, Clock, Send, Eye, Trash2, X, Upload,
  Building2, User, Calendar, DollarSign, Percent, AlertCircle, Save, Edit, Edit3, Pencil, RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi, projectsApi, stakeholdersApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { generateBillingInvoicePDF, generateExactCoreterraInvoicePDF } from '../utils/billingInvoicePDF';
import { generateFormat2InvoicePDF } from '../utils/invoiceFormat2PDF';
import { generatePaymentReceiptPDF } from '../utils/paymentReceiptPDF';

const API_ROOT = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://127.0.0.1:8000/api/v1');
const API_BASE = `${API_ROOT}/finance`;

// ---- Types ----
interface BillingTerm {
  id: string;
  term_number: number;
  term_name: string;
  term_name_en: string;
  percentage: number;
  amount: number;
  amount_before_tax: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  description: string;
  description_en: string;
  status: 'Pending' | 'Invoiced' | 'Paid';
  invoice_number: string | null;
  invoice_date: string | null;
  ar_invoice_id: string | null;
}

interface BillingSchedule {
  id: string;
  schedule_number: string;
  project_id: string | null;
  customer_id: string;
  project_name: string | null;
  project_code: string | null;
  customer_name: string;
  contract_description: string;
  contract_number: string;
  total_contract_value: number;
  currency: string;
  exchange_rate: number;
  include_ppn: boolean;
  ppn_rate: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  notes: string;
  status: string;
  terms: BillingTerm[];
  total_invoiced: number;
  total_paid: number;
  terms_count: number;
  created_at: string;
}

const DEFAULT_TERM_NAMES = [
  { id: 'Uang Muka (DP)', en: 'Down Payment' },
  { id: 'Termin 1', en: 'Progress Payment 1' },
  { id: 'Termin 2', en: 'Progress Payment 2' },
  { id: 'Termin 3', en: 'Progress Payment 3' },
  { id: 'Termin 4', en: 'Progress Payment 4' },
  { id: 'Pelunasan', en: 'Final Payment' },
];

function getTermStatusColor(status: string) {
  switch (status) {
    case 'Paid': return 'bg-success/15 text-success border border-success/30';
    case 'Invoiced': return 'bg-blue-500/15 text-blue-500 border border-blue-500/30';
    default: return 'bg-warning/15 text-warning border border-warning/30';
  }
}

function getTermStatusIcon(status: string) {
  switch (status) {
    case 'Paid': return <CheckCircle className="w-3.5 h-3.5" />;
    case 'Invoiced': return <Send className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
}

function formatCurrency(val: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

// ---- Generate Invoice Modal ----
function GenerateInvoiceModal({
  schedule,
  term,
  coas,
  onClose,
  onSuccess,
}: {
  schedule: BillingSchedule;
  term: BillingTerm;
  coas: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [revenueAccountId, setRevenueAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const revenueAccounts = coas.filter((c: any) => c.account_code?.startsWith('4'));

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/billing-schedules/${schedule.id}/terms/${term.id}/generate-invoice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_date: invoiceDate,
          revenue_account_id: revenueAccountId || null,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Gagal membuat invoice');
      }
      addToast('success', 'Invoice Dibuat', `Invoice berhasil dibuat untuk ${term.term_name}`);
      onSuccess();
    } catch (e: any) {
      addToast('error', 'Gagal', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-textPrimary flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Buat Invoice
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-background rounded-lg text-textSecondary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-background/60 border border-border rounded-xl p-4 text-sm space-y-1">
            <p className="font-semibold text-textPrimary">{term.term_name} / {term.term_name_en}</p>
            <p className="text-textSecondary">{schedule.customer_name}</p>
            <p className="text-primary font-bold text-base mt-1">{formatCurrency(term.total_amount, schedule.currency)}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wide">Tanggal Invoice</label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-textSecondary uppercase tracking-wide">
              Akun Pendapatan (Opsional)
            </label>
            <select
              value={revenueAccountId}
              onChange={(e) => setRevenueAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">-- Pilih Akun --</option>
              {revenueAccounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-background text-textPrimary border border-border rounded-xl text-sm font-medium hover:bg-border transition-colors">
            Batal
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Membuat...' : '✓ Buat Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- New Schedule Form Modal ----
function NewScheduleModal({
  projects,
  customers,
  onClose,
  onCreated,
}: {
  projects: any[];
  customers: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [projectId, setProjectId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [contractDesc, setContractDesc] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [currency, setCurrency] = useState('IDR');
  const [exchangeRate, setExchangeRate] = useState('16000');
  const [includePpn, setIncludePpn] = useState(false);
  const [ppnRate, setPpnRate] = useState('11');
  const { settings: globalSettings } = useSettingsStore();
  const [bankName, setBankName] = useState(globalSettings.bankName || 'Bank Mandiri');
  const [bankAcc, setBankAcc] = useState(globalSettings.bankAccountNumber || '103-00-1332575-4');
  const [bankAccName, setBankAccName] = useState(globalSettings.bankAccountName || globalSettings.companyName || 'PT Coreterra Geo Engineering');

  useEffect(() => {
    if (globalSettings) {
      if (!bankName || bankName === 'Bank Mandiri') setBankName(globalSettings.bankName || 'Bank Mandiri');
      if (!bankAcc || bankAcc === '103-00-1332575-4') setBankAcc(globalSettings.bankAccountNumber || '103-00-1332575-4');
      if (!bankAccName || bankAccName === 'PT Coreterra Geo Engineering') setBankAccName(globalSettings.bankAccountName || globalSettings.companyName || 'PT Coreterra Geo Engineering');
    }
  }, [globalSettings.bankName, globalSettings.bankAccountNumber, globalSettings.bankAccountName, globalSettings.companyName]);
  const [numTerms, setNumTerms] = useState(3);
  const [terms, setTerms] = useState([
    { term_number: 1, term_name: 'Uang Muka (DP)', term_name_en: 'Down Payment', percentage: 30, due_date: '', description: '', description_en: '' },
    { term_number: 2, term_name: 'Termin 1', term_name_en: 'Progress Payment 1', percentage: 40, due_date: '', description: '', description_en: '' },
    { term_number: 3, term_name: 'Pelunasan', term_name_en: 'Final Payment', percentage: 30, due_date: '', description: '', description_en: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const totalVal = parseFloat(totalValue) || 0;
  const ppn = includePpn ? parseFloat(ppnRate) : 0;
  const totalPct = terms.reduce((s, t) => s + (t.percentage || 0), 0);

  const updateNumTerms = (n: number) => {
    setNumTerms(n);
    const names = DEFAULT_TERM_NAMES;
    const defaultPct = Math.round(100 / n);
    const newTerms = Array.from({ length: n }, (_, i) => {
      const pct = i === n - 1 ? 100 - defaultPct * (n - 1) : defaultPct;
      const amt = totalVal > 0 ? (pct / 100) * totalVal : 0;
      return {
        term_number: i + 1,
        term_name: names[i]?.id || `Termin ${i + 1}`,
        term_name_en: names[i]?.en || `Payment ${i + 1}`,
        percentage: pct,
        amount: amt,
        due_date: '',
        description: '',
        description_en: '',
      };
    });
    setTerms(newTerms);
  };

  const updateTerm = (idx: number, field: string, val: any) => {
    setTerms(prev => prev.map((t, i) => i === idx ? { ...t, [field]: val } : t));
  };

  const updateTermAmount = (idx: number, amtVal: number) => {
    setTerms(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      const pct = totalVal > 0 ? Number(((amtVal / totalVal) * 100).toFixed(2)) : t.percentage;
      return { ...t, amount: amtVal, percentage: pct };
    }));
  };

  const addTermRow = () => {
    setTerms(prev => {
      const nextNum = prev.length + 1;
      return [
        ...prev,
        {
          term_number: nextNum,
          term_name: `Termin ${nextNum}`,
          term_name_en: `Payment ${nextNum}`,
          percentage: 0,
          amount: 0,
          due_date: '',
          description: '',
          description_en: '',
        }
      ];
    });
  };

  const removeTermRow = (idx: number) => {
    if (terms.length <= 1) return addToast('warning', 'Peringatan', 'Minimal harus ada 1 termin');
    setTerms(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.map((t, i) => ({ ...t, term_number: i + 1 }));
    });
  };

  const splitDpTerm = () => {
    setTerms(prev => {
      if (prev.length === 0) return prev;
      const dp = prev[0];
      const halfPct = Number((dp.percentage / 2).toFixed(2));
      const halfAmt = totalVal > 0 ? Math.round(dp.amount / 2) : 0;

      const dp1 = {
        ...dp,
        term_number: 1,
        term_name: `${dp.term_name} - Tahap 1`,
        term_name_en: `${dp.term_name_en || 'Down Payment'} - Part 1`,
        percentage: halfPct,
        amount: halfAmt,
      };

      const dp2 = {
        ...dp,
        term_number: 2,
        term_name: `${dp.term_name} - Tahap 2`,
        term_name_en: `${dp.term_name_en || 'Down Payment'} - Part 2`,
        percentage: halfPct,
        amount: halfAmt,
      };

      const rest = prev.slice(1).map((t, i) => ({ ...t, term_number: i + 3 }));
      return [dp1, dp2, ...rest];
    });
    addToast('success', 'DP Di-split', 'Down Payment berhasil di-split menjadi 2 tahap (Tahap 1 & Tahap 2)');
  };

  const handleSubmit = async () => {
    if (!customerId) return addToast('error', 'Validasi', 'Pilih klien terlebih dahulu');
    if (!totalValue || totalVal <= 0) return addToast('error', 'Validasi', 'Masukkan nilai kontrak');
    if (Math.abs(totalPct - 100) > 1.5) return addToast('error', 'Validasi', `Total persentase harus ~100% (sekarang ${totalPct.toFixed(1)}%)`);

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/billing-schedules`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId || null,
          customer_id: customerId,
          contract_description: contractDesc,
          contract_number: contractNumber,
          total_contract_value: totalVal,
          currency,
          exchange_rate: parseFloat(exchangeRate) || 1,
          include_ppn: includePpn,
          ppn_rate: parseFloat(ppnRate) || 11,
          bank_name: bankName,
          bank_account_number: bankAcc,
          bank_account_name: bankAccName,
          terms,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Gagal membuat jadwal');
      }
      addToast('success', 'Berhasil', 'Jadwal tagihan berhasil dibuat');
      onCreated();
    } catch (e: any) {
      addToast('error', 'Gagal', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-2xl bg-card text-left align-middle shadow-2xl transition-all w-full max-w-4xl sm:my-8 border border-border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-card">
            <h2 className="font-bold text-textPrimary flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-primary" /> Buat Jadwal Tagihan Baru
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-background rounded-lg text-textSecondary"><X className="w-4 h-4" /></button>
          </div>

          <div className="p-5 space-y-6 bg-background/30">
          {/* Contract Info */}
          <section>
            <h3 className="text-xs font-bold text-textSecondary uppercase tracking-widest mb-3">Informasi Kontrak</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-textSecondary">Proyek (opsional)</label>
                <select
                  value={projectId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setProjectId(pId);
                    if (pId) {
                      const proj = projects.find((p: any) => p.id === pId);
                      if (proj) {
                        if (proj.customer_id) setCustomerId(proj.customer_id);
                        if (proj.contract_value_idr && !totalValue) setTotalValue(String(proj.contract_value_idr));
                        if (proj.name && !contractDesc) setContractDesc(proj.name);
                        if (proj.code && !contractNumber) setContractNumber(`KONTRAK/${proj.code}/2026`);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">-- Tanpa Proyek --</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-textSecondary flex items-center justify-between">
                  <span>Klien / Customer <span className="text-danger font-bold">*</span></span>
                  {!customerId && <span className="text-[10px] text-danger font-normal">Wajib dipilih</span>}
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={`w-full px-3 py-2 bg-background border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    !customerId ? 'border-danger/60 bg-danger/5' : 'border-border'
                  }`}
                >
                  <option value="">-- Pilih Klien --</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-textSecondary">Nomor Kontrak</label>
                <input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="e.g. KONTRAK/2026/001" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-textSecondary">Deskripsi Kontrak</label>
                <input value={contractDesc} onChange={(e) => setContractDesc(e.target.value)} placeholder="Ringkasan pekerjaan/layanan..." className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </section>

          {/* Financial */}
          <section className="border-t border-border pt-5">
            <h3 className="text-xs font-bold text-textSecondary uppercase tracking-widest mb-3">Nilai Kontrak & Pajak</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-textSecondary">Mata Uang</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="IDR">IDR (Rupiah)</option>
                  <option value="USD">USD (Dollar)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-textSecondary">Nilai Kontrak *</label>
                <input type="number" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} placeholder="2000000000" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              {currency === 'USD' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-textSecondary">Kurs IDR/USD</label>
                  <input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              )}
              <div className="flex items-center gap-3 md:col-span-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includePpn} onChange={(e) => setIncludePpn(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-textPrimary font-medium">Kenakan PPN?</span>
                </label>
                {includePpn && (
                  <div className="flex items-center gap-2">
                    <input type="number" value={ppnRate} onChange={(e) => setPpnRate(e.target.value)} className="w-20 px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none" />
                    <span className="text-textSecondary text-sm">%</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Bank */}
          <section className="border-t border-border pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-textSecondary uppercase tracking-widest">Info Pembayaran (untuk Invoice)</h3>
              <button
                type="button"
                onClick={() => {
                  setBankName(globalSettings.bankName || 'Bank Mandiri');
                  setBankAcc(globalSettings.bankAccountNumber || '103-00-1332575-4');
                  setBankAccName(globalSettings.bankAccountName || globalSettings.companyName || 'PT Coreterra Geo Engineering');
                  addToast('info', 'Data Sinkron', 'Data rekening diambil dari Profil Perusahaan.');
                }}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded border border-primary/20 transition-colors"
                title="Muat ulang data rekening dari Pengaturan Profil Perusahaan"
              >
                <RotateCcw className="w-3 h-3" /> Ambil dari Profil Perusahaan
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-textSecondary">Nama Bank</label>
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Contoh: Bank Mandiri" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-textSecondary">Nomor Rekening</label>
                <input value={bankAcc} onChange={(e) => setBankAcc(e.target.value)} placeholder="Contoh: 103-00-1332575-4" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-textSecondary">Atas Nama</label>
                <input value={bankAccName} onChange={(e) => setBankAccName(e.target.value)} placeholder="Contoh: PT. CoreTerra Geo Engineering" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </section>

          {/* Terms */}
          <section className="border-t border-border pt-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-bold text-textSecondary uppercase tracking-widest">Jadwal Termin</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={splitDpTerm}
                  type="button"
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
                >
                  ⚡ Split DP (Tahap 1 & 2)
                </button>
                <button
                  onClick={addTermRow}
                  type="button"
                  className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris
                </button>
                <div className="flex items-center gap-1 ml-2">
                  <span className="text-xs text-textSecondary">Preset:</span>
                  {[2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => updateNumTerms(n)} className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${numTerms === n ? 'bg-primary text-primary-foreground' : 'bg-background text-textSecondary hover:bg-border'}`}>{n}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview total */}
            {totalVal > 0 && (
              <div className="flex items-center gap-2 mb-3 text-xs">
                <span className="text-textSecondary">Total Persentase:</span>
                <span className={`font-bold ${Math.abs(totalPct - 100) < 1.5 ? 'text-success' : 'text-danger'}`}>{totalPct.toFixed(1)}%</span>
                {Math.abs(totalPct - 100) > 1.5 && <span className="text-danger flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Harus ~100%</span>}
              </div>
            )}

            <div className="space-y-3">
              {terms.map((term, idx) => {
                const baseAmt = term.amount ?? (totalVal > 0 ? (term.percentage / 100) * totalVal : 0);
                const tax = includePpn ? baseAmt * (parseFloat(ppnRate) / 100) : 0;
                const total = baseAmt + tax;
                return (
                  <div key={idx} className="bg-background/60 border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{term.term_number}</span>
                      <div className="flex-1 grid grid-cols-2 gap-2 min-w-[200px]">
                        <input value={term.term_name} onChange={(e) => updateTerm(idx, 'term_name', e.target.value)} placeholder="Nama Termin (ID)" className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary/50" />
                        <input value={term.term_name_en} onChange={(e) => updateTerm(idx, 'term_name_en', e.target.value)} placeholder="Term Name (EN)" className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      
                      {/* Dual Input: Nominal Money & Percentage */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-textSecondary">{currency === 'USD' ? '$' : 'Rp'}</span>
                          <input
                            type="number"
                            value={term.amount || ''}
                            onChange={(e) => updateTermAmount(idx, parseFloat(e.target.value) || 0)}
                            placeholder="Nominal Uang"
                            className="w-36 px-2.5 py-1.5 bg-card border border-border rounded-lg text-sm text-right text-textPrimary font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={term.percentage || ''}
                            onChange={(e) => updateTermPercentage(idx, parseFloat(e.target.value) || 0)}
                            placeholder="%"
                            className="w-16 px-2 py-1.5 bg-card border border-border rounded-lg text-sm text-right text-textPrimary font-bold focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                          <span className="text-textSecondary text-sm font-bold">%</span>
                        </div>
                        {terms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTermRow(idx)}
                            className="p-1.5 text-textSecondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title="Hapus Termin Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input type="date" value={term.due_date} onChange={(e) => updateTerm(idx, 'due_date', e.target.value)} className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-textPrimary focus:outline-none" />
                      <input value={term.description} onChange={(e) => updateTerm(idx, 'description', e.target.value)} placeholder="Milestone / Keterangan (ID)" className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-textPrimary focus:outline-none" />
                      <input value={term.description_en} onChange={(e) => updateTerm(idx, 'description_en', e.target.value)} placeholder="Description (EN)" className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-textPrimary focus:outline-none" />
                      <input value={(term as any).unit || 'Lump Sum'} onChange={(e) => updateTerm(idx, 'unit', e.target.value)} placeholder="Satuan / Unit (Lump Sum)" className="px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-textPrimary focus:outline-none" />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-textSecondary bg-card/60 p-2 rounded-lg border border-border/50">
                      <span>DPP / Subtotal: <strong className="text-textPrimary font-mono">{formatCurrency(baseAmt, currency)}</strong></span>
                      {includePpn && <span>PPN ({ppnRate}%): <strong className="text-textPrimary font-mono">{formatCurrency(tax, currency)}</strong></span>}
                      <span className="ml-auto font-bold text-primary font-mono text-sm">Total: {formatCurrency(total, currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-border flex gap-3 bg-card">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-background text-textPrimary border border-border rounded-xl text-sm font-medium hover:bg-border transition-colors">
            Batal
          </button>
          <button onClick={handleSubmit} disabled={loading || terms.length === 0} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Menyimpan...' : 'Simpan Jadwal'}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}

// ---- Schedule Card ----
function ScheduleCard({
  schedule,
  coas,
  onRefresh,
}: {
  schedule: BillingSchedule;
  coas: any[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [generateModal, setGenerateModal] = useState<BillingTerm | null>(null);
  const [printPreview, setPrintPreview] = useState<BillingTerm | null>(null);
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [editTermObj, setEditTermObj] = useState<BillingTerm | null>(null);
  const [showAddTerm, setShowAddTerm] = useState(false);
  const { settings } = useSettingsStore();
  const addToast = useToastStore((s) => s.addToast);

  const progress = schedule.total_contract_value > 0
    ? Math.round((schedule.total_paid / schedule.total_contract_value) * 100)
    : 0;

  const handlePrintInvoice = (term: BillingTerm) => {
    const prevTerms = schedule.terms.filter(t => t.term_number < term.term_number && (t.status === 'Invoiced' || t.status === 'Paid'));
    const prevBilledTotal = prevTerms.reduce((sum, t) => sum + (t.amount || t.total_amount), 0);
    const prevInvoiceNum = prevTerms.map(t => t.invoice_number).filter(Boolean).join(', ');

    generateExactCoreterraInvoicePDF({
      invoiceNumber: term.invoice_number || undefined,
      invoiceDate: term.invoice_date || undefined,
      poNumber: schedule.contract_number || undefined,
      customerName: schedule.customer_name || undefined,
      projectName: schedule.contract_description || undefined,
      itemDescription: term.term_name || undefined,
      itemDescriptionEn: term.term_name_en || undefined,
      milestone: term.description || undefined,
      unit: (term as any).unit || 'Lump Sump',
      amount: term.amount || term.total_amount,
      totalContract: schedule.total_contract_value || undefined,
      prevBilledTotal,
      prevInvoiceNum,
      bankName: schedule.bank_name || settings.bankName,
      bankAccountNumber: schedule.bank_account_number || settings.bankAccountNumber,
      bankAccountName: schedule.bank_account_name || settings.bankAccountName || settings.companyName,
    });
  };

  const handlePrintFormat2Invoice = (term: BillingTerm) => {
    const prevTerms = schedule.terms.filter(t => t.term_number < term.term_number && (t.status === 'Invoiced' || t.status === 'Paid'));
    const prevBilledTotal = prevTerms.reduce((sum, t) => sum + (t.amount || t.total_amount), 0);
    const prevInvoiceNum = prevTerms.map(t => t.invoice_number).filter(Boolean).join(', ');

    generateFormat2InvoicePDF({
      invoiceNumber: term.invoice_number || 'INV-2026-001',
      invoiceDate: term.invoice_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      customerName: schedule.customer_name || 'PT Solusi Monitoring Indonesia',
      customerCode: 'SMI-2026',
      customerAddress: 'Gedung Menara Mulia Lt. 12, Jl. Gatot Subroto Kav. 9-11, Jakarta Selatan 12930',
      customerNpwp: '01.234.567.8-012.000',
      companyName: settings.companyName || 'PT CORETERRA GEO ENGINEERING',
      companyNpwp: settings.taxId || '1000 0000 1002 1192',
      companyAddress: settings.address || 'Gardenia Estate, Blok A5 No 12 RT 007 RW 014, Ciputat, Kota Tangerang Selatan, Banten 15411',
      companyBranch: 'Head Office Tangerang Selatan & Jakarta',
      bankName: schedule.bank_name || settings.bankName,
      bankAccountNo: schedule.bank_account_number || settings.bankAccountNumber,
      bankAccountName: schedule.bank_account_name || settings.bankAccountName || settings.companyName,
      orderNumber: `ORD-${(term.invoice_number || '41010226').replace(/[^0-9]/g, '').slice(-8)}`,
      contractNumber: schedule.contract_number || 'KONTRAK/004_IKPT-SOLOK-001/2026',
      poNumber: `PO-${schedule.contract_number || 'IKPT-SOLOK-2026-08'}`,
      activityTitle: `${term.term_name || 'PEMBAYARAN TERMIN'} - ${schedule.contract_description || 'Washbore Borpile & Foundation Project'}`,
      feeAmount: term.amount || term.total_amount,
      taxAmount: term.tax_amount || (term.total_amount ? term.total_amount - Math.round(term.total_amount / 1.11) : 0),
      totalAmount: term.total_amount || term.amount,
      prevBilledTotal,
      prevInvoiceNum,
      totalContractAmount: schedule.total_contract_value || (term.total_amount * 2),
      signatoryName: 'Setyo Mardani'
    });
  };

  const handlePrintKwitansi = (term: BillingTerm) => {
    const termAmt = term.total_amount || term.amount || 0;
    const dppVal = term.amount_before_tax || (termAmt > 0 ? Math.round(termAmt / 1.12) : 0);
    const taxVal = term.tax_amount || (termAmt > 0 ? termAmt - dppVal : 0);

    generatePaymentReceiptPDF({
      receiptNumber: `KWT/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${(term.invoice_number || '001').replace(/[^0-9]/g, '').slice(-4) || '001'}`,
      invoiceNumber: term.invoice_number || 'INV-2026-001',
      paymentDate: term.invoice_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      receiptDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      customerName: schedule.customer_name || 'PT Solusi Monitoring Indonesia',
      projectName: schedule.contract_description || 'Washbore Borpile & Foundation Project, Muara Laboh',
      poNumber: `PO-${schedule.contract_number || 'IKPT-SOLOK-2026-08'}`,
      contractNumber: schedule.contract_number || 'KONTRAK/004_IKPT-SOLOK-001/2026',
      milestone: term.term_name || 'Pembayaran Termin',
      amount: termAmt,
      dppAmount: dppVal,
      taxAmount: taxVal,
      taxRate: 12,
      signatoryName: 'Setyo Mardani'
    });
  };

  const handleMarkPaid = async (term: BillingTerm) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/billing-schedules/${schedule.id}/terms/${term.id}/mark-paid`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast('success', 'Lunas', `${term.term_name} ditandai sebagai Lunas`);
      onRefresh();
    } catch {
      addToast('error', 'Gagal', 'Gagal memperbarui status');
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div
          className="p-5 cursor-pointer hover:bg-background/40 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2.5 bg-primary/10 rounded-xl mt-0.5">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-primary font-bold">{schedule.schedule_number}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    schedule.status === 'Completed' ? 'bg-success/10 text-success' :
                    schedule.status === 'Cancelled' ? 'bg-danger/10 text-danger' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>{schedule.status}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEditSchedule(true); }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 rounded-lg text-xs font-semibold transition-colors"
                    title="Edit Informasi Jadwal Kontrak"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Jadwal
                  </button>
                </div>
                <h3 className="font-bold text-textPrimary mt-0.5 truncate">{schedule.customer_name}</h3>
                {schedule.project_name && (
                  <p className="text-xs text-textSecondary truncate">{schedule.project_code} — {schedule.project_name}</p>
                )}
                {schedule.contract_number && (
                  <p className="text-xs text-textSecondary font-mono">No. Kontrak: {schedule.contract_number}</p>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-textPrimary text-sm">{formatCurrency(schedule.total_contract_value, schedule.currency)}</p>
              <p className="text-xs text-textSecondary mt-0.5">{schedule.terms_count} Termin</p>
              {expanded ? <ChevronDown className="w-4 h-4 text-textSecondary ml-auto mt-2" /> : <ChevronRight className="w-4 h-4 text-textSecondary ml-auto mt-2" />}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-textSecondary">
              <span>Progres Pembayaran</span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-textSecondary">
              <span>Tertagih: {formatCurrency(schedule.total_invoiced, schedule.currency)}</span>
              <span>Lunas: {formatCurrency(schedule.total_paid, schedule.currency)}</span>
            </div>
          </div>
        </div>

        {/* Expanded terms */}
        {expanded && (
          <div className="border-t border-border">
            {/* Terms pipeline */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-textSecondary uppercase tracking-widest">Rincian Termin</h4>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddTerm(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success hover:bg-success/20 border border-success/20 rounded-lg text-xs font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> + Tambah Termin Tagihan
                </button>
              </div>
              {schedule.terms.map((term, idx) => {
                const isNextInLine = term.status === 'Pending' &&
                  (idx === 0 || schedule.terms[idx - 1].status !== 'Pending');
                return (
                  <div key={term.id} className={`border rounded-xl p-4 transition-all ${
                    term.status === 'Paid' ? 'border-success/30 bg-success/5' :
                    term.status === 'Invoiced' ? 'border-blue-500/30 bg-blue-500/5' :
                    isNextInLine ? 'border-primary/40 bg-primary/5' :
                    'border-border bg-background/30'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          term.status === 'Paid' ? 'bg-success text-white' :
                          term.status === 'Invoiced' ? 'bg-blue-500 text-white' :
                          isNextInLine ? 'bg-primary text-white' :
                          'bg-border text-textSecondary'
                        }`}>{term.term_number}</div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-textPrimary text-sm">{term.term_name}</p>
                            <span className="text-xs text-textSecondary italic">/ {term.term_name_en}</span>
                          </div>
                          <p className="text-xs text-textSecondary mt-0.5">{term.description}</p>
                          {term.due_date && <p className="text-xs text-textSecondary">Jatuh Tempo: <span className="font-medium">{term.due_date}</span></p>}
                          {term.invoice_number && (
                            <p className="text-xs font-mono text-primary mt-0.5">Invoice: {term.invoice_number} ({term.invoice_date})</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-textPrimary text-sm">{formatCurrency(term.total_amount, schedule.currency)}</p>
                        <p className="text-xs text-textSecondary">{term.percentage}%</p>
                        {schedule.include_ppn && <p className="text-xs text-textSecondary">+ PPN {schedule.ppn_rate}%</p>}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${getTermStatusColor(term.status)}`}>
                          {getTermStatusIcon(term.status)} {term.status === 'Paid' ? 'Lunas' : term.status === 'Invoiced' ? 'Tertagih' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditTermObj(term); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg text-xs font-bold hover:bg-amber-500/20 transition-colors"
                        title="Edit Rincian Termin Ini"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit Termin
                      </button>
                      {term.status === 'Pending' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Hapus ${term.term_name}?`)) {
                              try {
                                await financeApi.deleteBillingTerm(schedule.id, term.id);
                                addToast('success', 'Berhasil', `${term.term_name} berhasil dihapus`);
                                onRefresh();
                              } catch (err: any) {
                                addToast('error', 'Gagal', err.response?.data?.detail || 'Gagal menghapus termin');
                              }
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded-lg text-xs font-medium hover:bg-danger/20 transition-colors"
                          title="Hapus Termin"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      )}
                      {term.status === 'Pending' && isNextInLine && (
                        <button
                          onClick={() => setGenerateModal(term)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Send className="w-3 h-3" /> Buat Invoice
                        </button>
                      )}
                      {term.status === 'Invoiced' && (
                        <>
                          <button
                            onClick={() => handlePrintInvoice(term)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors"
                            title="Print Invoice Format 1"
                          >
                            <Eye className="w-3 h-3" /> PDF 1
                          </button>
                          <button
                            onClick={() => handlePrintFormat2Invoice(term)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-700/10 text-emerald-800 border border-emerald-700/20 rounded-lg text-xs font-medium hover:bg-emerald-700/20 transition-colors"
                            title="Print Invoice Format 2 (BUMN/Kuitansi)"
                          >
                            <FileText className="w-3 h-3" /> PDF 2
                          </button>
                          <button
                            onClick={() => handleMarkPaid(term)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success border border-success/20 rounded-lg text-xs font-medium hover:bg-success/20 transition-colors"
                          >
                            <CheckCircle className="w-3 h-3" /> Tandai Lunas
                          </button>
                        </>
                      )}
                      {term.status === 'Paid' && (
                        <>
                          <button
                            onClick={() => handlePrintInvoice(term)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors"
                            title="Print Invoice Format 1"
                          >
                            <Eye className="w-3 h-3" /> PDF 1
                          </button>
                          <button
                            onClick={() => handlePrintFormat2Invoice(term)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-700/10 text-emerald-800 border border-emerald-700/20 rounded-lg text-xs font-medium hover:bg-emerald-700/20 transition-colors"
                            title="Print Invoice Format 2 (BUMN/Kuitansi)"
                          >
                            <FileText className="w-3 h-3" /> PDF 2
                          </button>
                          <button
                            onClick={() => handlePrintKwitansi(term)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-colors"
                            title="Print Kwitansi / Official Receipt"
                          >
                            <FileText className="w-3 h-3 text-amber-600" /> Kwitansi
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {generateModal && (
        <GenerateInvoiceModal
          schedule={schedule}
          term={generateModal}
          coas={coas}
          onClose={() => setGenerateModal(null)}
          onSuccess={() => { setGenerateModal(null); onRefresh(); }}
        />
      )}

      {showEditSchedule && (
        <EditScheduleModal
          schedule={schedule}
          onClose={() => setShowEditSchedule(false)}
          onSaveSuccess={onRefresh}
        />
      )}

      {editTermObj && (
        <EditTermModal
          schedule={schedule}
          term={editTermObj}
          onClose={() => setEditTermObj(null)}
          onSaveSuccess={onRefresh}
        />
      )}

      {showAddTerm && (
        <AddTermModal
          schedule={schedule}
          onClose={() => setShowAddTerm(false)}
          onSaveSuccess={onRefresh}
        />
      )}
    </>
  );
}


// ---- Custom PDF Parameters Modal ----
function CustomizePdfModal({ onClose }: { onClose: () => void }) {
  const [invNumber, setInvNumber] = useState('INV/001/004_IKPT-SOLOK-001/08/2026');
  const [invDate, setInvDate] = useState('05 August 2026');
  const [poNumber, setPoNumber] = useState('KONTRAK/004_IKPT-SOLOK-001/2026');
  const [custName, setCustName] = useState('PT Solusi Monitoring Indonesia');
  const [projName, setProjName] = useState('Washbore Borpile & Foundation Project, Muara Laboh, West Sumatera');
  const [itemDesc, setItemDesc] = useState('First Down Payment');
  const [itemDescEn, setItemDescEn] = useState('');
  const [milestone, setMilestone] = useState('Field preparation');
  const [unit, setUnit] = useState('Lump Sump');
  const [amount, setAmount] = useState('175000000');
  const [totalDp, setTotalDp] = useState('800000000');
  const [totalContract, setTotalContract] = useState('2870121121');

  const handlePreview = () => {
    generateExactCoreterraInvoicePDF({
      invoiceNumber: invNumber,
      invoiceDate: invDate,
      poNumber: poNumber,
      customerName: custName,
      projectName: projName,
      itemDescription: itemDesc,
      itemDescriptionEn: itemDescEn,
      milestone: milestone,
      unit: unit,
      amount: parseFloat(amount) || 0,
      totalDp: parseFloat(totalDp) || 0,
      totalContract: parseFloat(totalContract) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-textPrimary text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" /> Adjust & Preview Invoice PDF
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-background rounded-lg text-textSecondary"><X className="w-4 h-4" /></button>
          </div>

          <p className="text-xs text-textSecondary">
            Sesuaikan deskripsi item, milestone, satuan (unit), nominal tagihan, dan alokasi DP sesuai kebutuhan Anda sebelum membukanya di PDF:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-textSecondary">Nomor Invoice</label>
              <input value={invNumber} onChange={e => setInvNumber(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-textSecondary">Tanggal Invoice</label>
              <input value={invDate} onChange={e => setInvDate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-semibold text-textSecondary">Deskripsi Item / Termin (Item & Payment Terms)</label>
              <input value={itemDesc} onChange={e => setItemDesc(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Uang Muka (DP) - Tahap 1" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-semibold text-textSecondary">Milestone (Rincian Pekerjaan)</label>
              <input value={milestone} onChange={e => setMilestone(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Pekerjaan Persiapan Lapangan & Mobilisasi Alat" />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-textSecondary">Satuan (Unit)</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Lump Sum / Set / Unit / m3 / ls" />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-textSecondary">Nominal Tagihan Ini (Rp)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono font-medium" />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-textSecondary">Total Alokasi DP (Rp)</label>
              <input type="number" value={totalDp} onChange={e => setTotalDp(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono font-medium" />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-textSecondary">Nilai Total Kontrak Proyek (Rp)</label>
              <input type="number" value={totalContract} onChange={e => setTotalContract(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono font-medium" />
            </div>
          </div>

          <div className="pt-3 border-t border-border flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-textPrimary hover:bg-border">Batal</button>
            <button onClick={handlePreview} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-1.5">
              <Eye className="w-4 h-4" /> Buka Preview PDF (Tab Baru)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



// ---- Edit Schedule Header Modal ----
function EditScheduleModal({ schedule, onClose, onSaveSuccess }: { schedule: any; onClose: () => void; onSaveSuccess: () => void }) {
  const [contractNumber, setContractNumber] = useState(schedule.contract_number || '');
  const [contractDesc, setContractDesc] = useState(schedule.contract_description || '');
  const [totalVal, setTotalVal] = useState(schedule.total_contract_value?.toString() || '0');
  const [currency, setCurrency] = useState(schedule.currency || 'IDR');
  const [includePpn, setIncludePpn] = useState(schedule.include_ppn ?? false);
  const [ppnRate, setPpnRate] = useState(schedule.ppn_rate?.toString() || '11');
  const { settings: globalSettings } = useSettingsStore();
  const [bankName, setBankName] = useState(schedule.bank_name || globalSettings.bankName || 'Bank Mandiri');
  const [bankAccNo, setBankAccNo] = useState(schedule.bank_account_number || globalSettings.bankAccountNumber || '103-00-1332575-4');
  const [bankAccName, setBankAccName] = useState(schedule.bank_account_name || globalSettings.bankAccountName || globalSettings.companyName || 'PT Coreterra Geo Engineering');
  const [notes, setNotes] = useState(schedule.notes || '');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await financeApi.updateBillingSchedule(schedule.id, {
        contract_number: contractNumber,
        contract_description: contractDesc,
        total_contract_value: parseFloat(totalVal) || 0,
        currency,
        include_ppn: includePpn,
        ppn_rate: parseFloat(ppnRate) || 11,
        bank_name: bankName,
        bank_account_number: bankAccNo,
        bank_account_name: bankAccName,
        notes
      });
      addToast('success', 'Berhasil', 'Jadwal Tagihan berhasil diperbarui!');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal', err.response?.data?.detail || 'Gagal memperbarui Jadwal Tagihan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-textPrimary text-lg flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Edit Header Jadwal Tagihan ({schedule.schedule_number})
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-background rounded-lg text-textSecondary"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Nomor Kontrak / PO</label>
                <input value={contractNumber} onChange={e => setContractNumber(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Contoh: KONTRAK/004_IKPT-SOLOK-001/2026" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Nilai Total Kontrak (Rp)</label>
                <input type="number" value={totalVal} onChange={e => setTotalVal(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono font-medium" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-textSecondary">Deskripsi Kontrak / Nama Proyek</label>
                <input value={contractDesc} onChange={e => setContractDesc(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Contoh: Borpile & Struktur - IKPT Solok" />
              </div>
              <div className="md:col-span-2 flex items-center justify-between border-t border-border pt-2 mt-1">
                <span className="font-bold text-textSecondary uppercase tracking-wider text-[11px]">Info Rekening Pembayaran</span>
                <button
                  type="button"
                  onClick={() => {
                    setBankName(globalSettings.bankName || 'Bank Mandiri');
                    setBankAccNo(globalSettings.bankAccountNumber || '103-00-1332575-4');
                    setBankAccName(globalSettings.bankAccountName || globalSettings.companyName || 'PT Coreterra Geo Engineering');
                    addToast('info', 'Data Sinkron', 'Data rekening diperbarui dari Profil Perusahaan.');
                  }}
                  className="text-primary hover:text-primary/80 flex items-center gap-1 font-medium bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded border border-primary/20 transition-colors text-[11px]"
                  title="Muat data rekening dari Pengaturan Profil Perusahaan"
                >
                  <RotateCcw className="w-3 h-3" /> Ambil dari Profil Perusahaan
                </button>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Nama Bank</label>
                <input value={bankName} onChange={e => setBankName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Nomor Rekening Bank</label>
                <input value={bankAccNo} onChange={e => setBankAccNo(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-textSecondary">Atas Nama Rekening</label>
                <input value={bankAccName} onChange={e => setBankAccName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-textPrimary hover:bg-border">Batal</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-md hover:bg-primary/90 disabled:opacity-50">
                {loading ? 'Memproses...' : '✓ Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// ---- Add New Term Modal ----
function AddTermModal({ schedule, onClose, onSaveSuccess }: { schedule: any; onClose: () => void; onSaveSuccess: () => void }) {
  const nextNum = (schedule.terms?.length || 0) + 1;
  const [termNumber, setTermNumber] = useState(nextNum.toString());
  const [termName, setTermName] = useState(`Termin ${nextNum}`);
  const [termNameEn, setTermNameEn] = useState(`Payment ${nextNum}`);
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('Lump Sump');
  const [amount, setAmount] = useState('0');
  const [percentage, setPercentage] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  // Auto calculate amount from percentage
  const handlePercentageChange = (val: string) => {
    setPercentage(val);
    const pct = parseFloat(val) || 0;
    if (schedule.total_contract_value > 0) {
      const calcAmount = (pct / 100) * schedule.total_contract_value;
      setAmount(Math.round(calcAmount).toString());
    }
  };

  // Auto calculate percentage from amount
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const amt = parseFloat(val) || 0;
    if (schedule.total_contract_value > 0) {
      const calcPct = (amt / schedule.total_contract_value) * 100;
      setPercentage(calcPct.toFixed(2));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await financeApi.addBillingTerm(schedule.id, {
        term_number: parseInt(termNumber) || nextNum,
        term_name: termName,
        term_name_en: termNameEn,
        description,
        unit,
        amount: parseFloat(amount) || 0,
        percentage: parseFloat(percentage) || 0,
        due_date: dueDate || null
      });
      addToast('success', 'Berhasil', `Termin ${termName} berhasil ditambahkan!`);
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal', err.response?.data?.detail || 'Gagal menambahkan termin baru');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-textPrimary text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-success" /> Tambah Termin Tagihan Baru ({schedule.schedule_number})
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-background rounded-lg text-textSecondary"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Nomor Urut Termin</label>
                <input type="number" value={termNumber} onChange={e => setTermNumber(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Satuan (Unit)</label>
                <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Lump Sump / Unit / Set" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-textSecondary">Nama Termin (Bahasa Indonesia)</label>
                <input value={termName} onChange={e => setTermName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Termin 6 / Addendum Progress" required />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-textSecondary">Nama Termin (Bahasa Inggris - Opsional)</label>
                <input value={termNameEn} onChange={e => setTermNameEn(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Progress Payment 6" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-textSecondary">Milestone / Rincian Pekerjaan</label>
                <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Pekerjaan Tambahan Pondasi & Struktur" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Persentase (%)</label>
                <input type="number" step="0.01" value={percentage} onChange={e => handlePercentageChange(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Nominal Tagihan (Rp)</label>
                <input type="number" value={amount} onChange={e => handleAmountChange(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono font-bold text-success" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-textSecondary">Tanggal Jatuh Tempo</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-textPrimary hover:bg-border">Batal</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-success text-white rounded-xl text-sm font-bold shadow-md hover:bg-success/90 disabled:opacity-50">
                {loading ? 'Memproses...' : '+ Tambahkan Termin Baru'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// ---- Edit Term / Invoice Modal ----
function EditTermModal({ schedule, term, onClose, onSaveSuccess }: { schedule: any; term: any; onClose: () => void; onSaveSuccess: () => void }) {
  const [termName, setTermName] = useState(term.term_name || '');
  const [termNameEn, setTermNameEn] = useState(term.term_name_en || '');
  const [description, setDescription] = useState(term.description || '');
  const [descriptionEn, setDescriptionEn] = useState(term.description_en || '');
  const [unit, setUnit] = useState(term.unit || 'Lump Sump');
  const [amount, setAmount] = useState(term.amount?.toString() || '0');
  const [percentage, setPercentage] = useState(term.percentage?.toString() || '0');
  const [dueDate, setDueDate] = useState(term.due_date || '');
  const [invoiceNumber, setInvoiceNumber] = useState(term.invoice_number || '');
  const [invoiceDate, setInvoiceDate] = useState(term.invoice_date || '');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await financeApi.updateBillingTerm(schedule.id, term.id, {
        term_name: termName,
        term_name_en: termNameEn,
        description,
        description_en: descriptionEn,
        unit,
        amount: parseFloat(amount) || 0,
        percentage: parseFloat(percentage) || 0,
        due_date: dueDate,
        invoice_number: invoiceNumber || null,
        invoice_date: invoiceDate || null
      });
      addToast('success', 'Berhasil', 'Rincian Termin & Invoice berhasil diperbarui!');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal', err.response?.data?.detail || 'Gagal memperbarui rincian termin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-textPrimary text-lg flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-500" /> Edit Termin {term.term_number}: {term.term_name}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-background rounded-lg text-textSecondary"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-textSecondary">Nama Termin (Payment Terms ID)</label>
                <input value={termName} onChange={e => setTermName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. First Down Payment / Uang Muka (DP) - Tahap 1" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-textSecondary">Nama Termin (EN - Opsional)</label>
                <input value={termNameEn} onChange={e => setTermNameEn(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Down Payment Part 1" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="font-semibold text-textSecondary">Milestone / Rincian Pekerjaan (ID)</label>
                <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="e.g. Field preparation / Pekerjaan Persiapan Lapangan" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Satuan (Unit)</label>
                <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" placeholder="Lump Sump / Unit / Set" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Nominal Tagihan (Rp)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono font-medium" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Persentase (%)</label>
                <input type="number" step="0.01" value={percentage} onChange={e => setPercentage(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Tanggal Jatuh Tempo</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" />
              </div>

              <div className="space-y-1 md:col-span-2 pt-2 border-t border-border/60">
                <label className="font-semibold text-amber-500 uppercase tracking-wider text-[11px]">Informasi Invoice (Jika Sudah Diterbitkan)</label>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Nomor Invoice</label>
                <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary font-mono" placeholder="e.g. INV/001/004_IKPT-SOLOK-001/08/2026" />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-textSecondary">Tanggal Invoice</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary" />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-textPrimary hover:bg-border">Batal</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50">
                {loading ? 'Memproses...' : '✓ Simpan Perubahan Termin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// ---- Main Page ----
export function BillingSchedulePage() {
  const [schedules, setSchedules] = useState<BillingSchedule[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [coas, setCoas] = useState<any[]>([]);
    const [showNewModal, setShowNewModal] = useState(false);
  const [showPdfCustomizeModal, setShowPdfCustomizeModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [editingTermObj, setEditingTermObj] = useState<{ schedule: any; term: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore((s) => s.addToast);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [schedRes, projRes, custRes, coaRes] = await Promise.all([
        fetch(`${API_BASE}/billing-schedules`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        projectsApi.getProjects(),
        stakeholdersApi.getCustomers(),
        fetch(`${API_ROOT}/master-data/financials/coas`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setSchedules(Array.isArray(schedRes) ? schedRes : []);
      setProjects(projRes.data || []);
      setCustomers(custRes.data || []);
      setCoas(Array.isArray(coaRes) ? coaRes : (coaRes?.data || []));
    } catch (e) {
      addToast('error', 'Error', 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const totalContractValue = schedules.reduce((s, b) => s + b.total_contract_value, 0);
  const totalInvoiced = schedules.reduce((s, b) => s + b.total_invoiced, 0);
  const totalPaid = schedules.reduce((s, b) => s + b.total_paid, 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Invoice Termin / Billing Schedule</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">Billing</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" /> Buat Jadwal Tagihan
          </button>
        </div>
      </div>
      {editingSchedule && <EditScheduleModal schedule={editingSchedule} onClose={() => setEditingSchedule(null)} onSaveSuccess={fetchSchedules} />}
      {editingTermObj && <EditTermModal schedule={editingTermObj.schedule} term={editingTermObj.term} onClose={() => setEditingTermObj(null)} onSaveSuccess={fetchSchedules} />}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Nilai Kontrak', labelEn: 'Total Contract Value', val: totalContractValue, icon: DollarSign, color: 'text-primary' },
          { label: 'Total Tertagih', labelEn: 'Total Invoiced', val: totalInvoiced, icon: Send, color: 'text-blue-500' },
          { label: 'Total Lunas', labelEn: 'Total Paid', val: totalPaid, icon: CheckCircle, color: 'text-success' },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 bg-background rounded-xl ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-textSecondary">{item.label} <span className="opacity-60">/ {item.labelEn}</span></p>
              <p className="text-xl font-bold text-textPrimary">{formatCurrency(item.val)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Schedules list */}
      {loading ? (
        <div className="text-center py-20 text-textSecondary">Memuat data...</div>
      ) : schedules.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
          <FileText className="w-12 h-12 text-textSecondary/30 mx-auto mb-4" />
          <h3 className="font-bold text-textPrimary">Belum ada jadwal tagihan</h3>
          <p className="text-sm text-textSecondary mt-1 mb-5">Buat jadwal penagihan termin untuk kontrak proyek Anda</p>
          <button onClick={() => setShowNewModal(true)} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4 inline mr-1.5" /> Buat Jadwal Tagihan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map(s => (
            <ScheduleCard key={s.id} schedule={s} coas={coas} onRefresh={fetchData} />
          ))}
        </div>
      )}

      {showNewModal && (
        <NewScheduleModal
          projects={projects}
          customers={customers}
          onClose={() => setShowNewModal(false)}
          onCreated={() => { setShowNewModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}
