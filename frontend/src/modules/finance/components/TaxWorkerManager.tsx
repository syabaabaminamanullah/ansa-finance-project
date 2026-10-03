import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Save, Eye, Users } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';

interface TaxWorker {
  id: string;
  name: string;
  npwp: string | null;
  ptkp_status: string | null;
  base_salary: number;
  join_date: string | null;
  exit_date: string | null;
  is_active: boolean;
  history: TaxWorkerHistory[];
}

interface TaxWorkerHistory {
  id: string;
  period_month: string;
  project_name: string;
  gross_salary: number;
  tax_amount: number;
  net_salary: number;
}

export function TaxWorkerManager() {
  const [workers, setWorkers] = useState<TaxWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    npwp: '',
    ptkp_status: 'TK/0',
    base_salary: 0,
    join_date: '',
    exit_date: '',
    is_active: true
  });

  // History modal state
  const [selectedWorker, setSelectedWorker] = useState<TaxWorker | null>(null);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    period_month: '',
    project_id: '',
    gross_salary: 0,
    tax_amount: 0,
    net_salary: 0
  });

  const formatNumber = (val: number) => {
    if (!val) return '';
    return val.toLocaleString('id-ID');
  };

  const handleNumberInput = (val: string, setter: (n: number) => void) => {
    const numericString = val.replace(/[^0-9]/g, '');
    setter(numericString ? parseInt(numericString, 10) : 0);
  };

  const calculateTax = (grossMonthly: number, ptkpStat: string, npwp: boolean) => {
    let ptkpYearly = 54000000;
    if (['K/0', 'TK/1'].includes(ptkpStat)) ptkpYearly = 58500000;
    if (['K/1', 'TK/2'].includes(ptkpStat)) ptkpYearly = 63000000;
    if (['K/2', 'TK/3'].includes(ptkpStat)) ptkpYearly = 67500000;
    if (['K/3'].includes(ptkpStat)) ptkpYearly = 72000000;

    const grossYearly = grossMonthly * 12;
    const biayaJabatan = Math.min(grossYearly * 0.05, 6000000);
    const netYearly = grossYearly - biayaJabatan;
    const pkp = Math.floor(Math.max(0, netYearly - ptkpYearly) / 1000) * 1000;
    
    let taxYearly = 0;
    let sisaPkp = pkp;

    if (sisaPkp > 0) {
      const layer1 = Math.min(sisaPkp, 60000000);
      taxYearly += layer1 * 0.05;
      sisaPkp -= layer1;
    }
    if (sisaPkp > 0) {
      const layer2 = Math.min(sisaPkp, 190000000);
      taxYearly += layer2 * 0.15;
      sisaPkp -= layer2;
    }
    if (sisaPkp > 0) {
      const layer3 = Math.min(sisaPkp, 250000000);
      taxYearly += layer3 * 0.25;
      sisaPkp -= layer3;
    }
    if (sisaPkp > 0) {
      const layer4 = Math.min(sisaPkp, 4500000000);
      taxYearly += layer4 * 0.30;
      sisaPkp -= layer4;
    }
    if (sisaPkp > 0) {
      taxYearly += sisaPkp * 0.35;
    }

    if (!npwp) taxYearly = taxYearly * 1.2;

    return taxYearly / 12;
  };

  useEffect(() => {
    fetchWorkers();
    fetchProjects();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://lode.annsa.site/api/v1/tax-workers');
      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('https://lode.annsa.site/api/v1/master-data/project-structure/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return alert('Nama wajib diisi');
    
    try {
      const url = editingId 
        ? `https://lode.annsa.site/api/v1/tax-workers/${editingId}`
        : `https://lode.annsa.site/api/v1/tax-workers`;
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        npwp: formData.npwp || null,
        join_date: formData.join_date || null,
        exit_date: formData.exit_date || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddForm(false);
        setEditingId(null);
        fetchWorkers();
        // Reset form
        setFormData({ name: '', npwp: '', ptkp_status: 'TK/0', base_salary: 0, join_date: '', exit_date: '', is_active: true });
      }
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan data');
    }
  };

  const handleEdit = (w: TaxWorker) => {
    setFormData({
      name: w.name,
      npwp: w.npwp || '',
      ptkp_status: w.ptkp_status || 'TK/0',
      base_salary: w.base_salary,
      join_date: w.join_date || '',
      exit_date: w.exit_date || '',
      is_active: w.is_active
    });
    setEditingId(w.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pekerja ini? Seluruh riwayat gajinya juga akan terhapus secara permanen.')) return;
    try {
      const res = await fetch(`https://lode.annsa.site/api/v1/tax-workers/${id}`, { method: 'DELETE' });
      if (res.ok) fetchWorkers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Pengelola Pekerja (HR)
          </h2>
          <p className="text-sm text-gray-500">
            Catatan internal profil pekerja, riwayat gaji, dan rekap potongan pajak PPh 21 (Terisolasi dari pembukuan kas/jurnal utama).
          </p>
        </div>
        <button 
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
            setFormData({ name: '', npwp: '', ptkp_status: 'TK/0', base_salary: 0, join_date: '', exit_date: '', is_active: true });
          }}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Pekerja
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">{editingId ? 'Edit Profil Pekerja' : 'Tambah Pekerja Baru'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nama Lengkap *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Cth: Budi Santoso" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">NIK / NPWP</label>
              <input type="text" value={formData.npwp} onChange={e => setFormData({...formData, npwp: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status PTKP</label>
              <select value={formData.ptkp_status} onChange={e => setFormData({...formData, ptkp_status: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                <option value="TK/0">TK/0 - Tidak Kawin, 0 Tanggungan</option>
                <option value="TK/1">TK/1 - Tidak Kawin, 1 Tanggungan</option>
                <option value="TK/2">TK/2 - Tidak Kawin, 2 Tanggungan</option>
                <option value="TK/3">TK/3 - Tidak Kawin, 3 Tanggungan</option>
                <option value="K/0">K/0 - Kawin, 0 Tanggungan</option>
                <option value="K/1">K/1 - Kawin, 1 Tanggungan</option>
                <option value="K/2">K/2 - Kawin, 2 Tanggungan</option>
                <option value="K/3">K/3 - Kawin, 3 Tanggungan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Gaji Pokok / Upah Dasar (Rp)</label>
              <input type="number" value={formData.base_salary} onChange={e => setFormData({...formData, base_salary: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Mulai (Join)</label>
              <input type="date" value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Berhenti (Exit)</label>
              <input type="date" value={formData.exit_date} onChange={e => setFormData({...formData, exit_date: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div className="flex items-center mt-6">
              <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="mr-2 rounded text-primary focus:ring-primary" />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Pekerja Aktif (Masih Bekerja)</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Batal</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark flex items-center gap-2"><Save className="w-4 h-4"/> Simpan Profil</button>
          </div>
        </div>
      )}

      {/* Workers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">Nama Pekerja</th>
                <th className="px-4 py-3 font-medium">NPWP & PTKP</th>
                <th className="px-4 py-3 font-medium text-right">Gaji Pokok Dasar</th>
                <th className="px-4 py-3 font-medium">Periode Kerja</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Riwayat</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Memuat data...</td></tr>
              ) : workers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Belum ada data pekerja.</td></tr>
              ) : (
                workers.map((w) => (
                  <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{w.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{w.npwp || '-'}</div>
                      <div className="text-xs text-primary font-semibold">{w.ptkp_status || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{formatCurrency(w.base_salary)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="text-xs">Masuk: {w.join_date || '-'}</div>
                      <div className="text-xs">Keluar: {w.exit_date || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${w.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {w.is_active ? 'Aktif' : 'Offboard'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setSelectedWorker(w)} className="text-blue-600 hover:text-blue-800 flex items-center justify-center w-full gap-1 text-xs font-medium">
                        <Eye className="w-4 h-4" /> {w.history.length} Catatan
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(w)} className="p-1.5 text-gray-500 hover:text-primary bg-gray-50 hover:bg-green-50 rounded transition-colors" title="Edit Profil">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(w.id)} className="p-1.5 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded transition-colors" title="Hapus Permanen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Riwayat Gaji & Pajak: {selectedWorker.name}</h3>
                <p className="text-xs text-gray-500">Catatan pribadi gaji bulanan. Tidak mempengaruhi jurnal/pembukuan.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setShowHistoryForm(!showHistoryForm);
                    if (!showHistoryForm) {
                      const initialGross = selectedWorker.base_salary || 0;
                      const hasNpwp = !!selectedWorker.npwp;
                      const initialTax = calculateTax(initialGross, selectedWorker.ptkp_status || 'TK/0', hasNpwp);
                      setHistoryForm({
                        period_month: new Date().toISOString().slice(0, 7),
                        project_id: '',
                        gross_salary: initialGross,
                        tax_amount: initialTax,
                        net_salary: initialGross - initialTax
                      });
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Catatan
                </button>
                <button onClick={() => { setSelectedWorker(null); setShowHistoryForm(false); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* Add History Form */}
              {showHistoryForm && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <h4 className="font-semibold text-sm text-gray-800">Tambah Catatan Gaji Baru</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Periode Bulan</label>
                      <input 
                        type="month" 
                        value={historyForm.period_month} 
                        onChange={e => setHistoryForm({...historyForm, period_month: e.target.value})} 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Proyek Penugasan</label>
                      <select 
                        value={historyForm.project_id} 
                        onChange={e => setHistoryForm({...historyForm, project_id: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      >
                        <option value="">- Head Office / Overhead -</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Gaji Bruto (Rp)</label>
                      <input 
                        type="text" 
                        value={formatNumber(historyForm.gross_salary)} 
                        onChange={e => handleNumberInput(e.target.value, (n) => {
                          const hasNpwp = !!selectedWorker?.npwp;
                          const newTax = calculateTax(n, selectedWorker?.ptkp_status || 'TK/0', hasNpwp);
                          setHistoryForm(prev => ({...prev, gross_salary: n, tax_amount: newTax, net_salary: n - newTax}));
                        })} 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        placeholder="4.500.000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Potongan PPh 21 (Rp)</label>
                      <input 
                        type="text" 
                        value={formatNumber(historyForm.tax_amount)} 
                        onChange={e => handleNumberInput(e.target.value, (n) => setHistoryForm(prev => ({...prev, tax_amount: n, net_salary: prev.gross_salary - n})))} 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Gaji Bersih / THP (Rp)</label>
                      <input 
                        type="text" 
                        value={formatNumber(historyForm.net_salary)} 
                        readOnly
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm font-mono bg-gray-100 text-success font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      onClick={() => setShowHistoryForm(false)}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={async () => {
                        if (!historyForm.period_month) return alert('Periode bulan wajib diisi');
                        if (!historyForm.gross_salary) return alert('Gaji bruto wajib diisi');
                        try {
                          const res = await fetch('https://lode.annsa.site/api/v1/tax-workers/history', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              worker_id: selectedWorker.id,
                              project_id: historyForm.project_id || null,
                              period_month: historyForm.period_month,
                              gross_salary: historyForm.gross_salary,
                              tax_amount: historyForm.tax_amount,
                              net_salary: historyForm.net_salary
                            })
                          });
                          if (res.ok) {
                            await fetchWorkers();
                            // Refresh selectedWorker data
                            const updatedWorkers = await (await fetch('https://lode.annsa.site/api/v1/tax-workers')).json();
                            const updated = updatedWorkers.find((w: TaxWorker) => w.id === selectedWorker.id);
                            if (updated) setSelectedWorker(updated);
                            setShowHistoryForm(false);
                          } else {
                            alert('Gagal menyimpan catatan');
                          }
                        } catch (e) {
                          console.error(e);
                          alert('Gagal menyimpan catatan');
                        }
                      }}
                      className="flex items-center gap-1 px-4 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" /> Simpan Catatan
                    </button>
                  </div>
                </div>
              )}

              {selectedWorker.history.length === 0 && !showHistoryForm ? (
                <div className="text-center py-12 text-gray-500">
                  Belum ada catatan gaji. Klik <strong>"+ Tambah Catatan"</strong> untuk mulai mencatat.
                </div>
              ) : selectedWorker.history.length > 0 && (
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 text-xs border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-3">Periode</th>
                        <th className="py-2 px-3">Proyek Penugasan</th>
                        <th className="py-2 px-3 text-right">Gaji Bruto</th>
                        <th className="py-2 px-3 text-right">Potongan PPh 21</th>
                        <th className="py-2 px-3 text-right">Gaji Bersih (THP)</th>
                        <th className="py-2 px-3 text-center w-12">Hapus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedWorker.history.map((h) => (
                        <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium text-gray-900">{h.period_month}</td>
                          <td className="py-2 px-3 text-gray-600">{h.project_name}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{formatCurrency(h.gross_salary)}</td>
                          <td className="py-2 px-3 text-right font-mono text-danger font-medium">-{formatCurrency(h.tax_amount)}</td>
                          <td className="py-2 px-3 text-right font-mono text-success font-bold">{formatCurrency(h.net_salary)}</td>
                          <td className="py-2 px-3 text-center">
                            <button 
                              onClick={async () => {
                                if (!confirm('Hapus catatan gaji ini?')) return;
                                try {
                                  const res = await fetch(`https://lode.annsa.site/api/v1/tax-workers/history/${h.id}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    await fetchWorkers();
                                    const updatedWorkers = await (await fetch('https://lode.annsa.site/api/v1/tax-workers')).json();
                                    const updated = updatedWorkers.find((w: TaxWorker) => w.id === selectedWorker.id);
                                    if (updated) setSelectedWorker(updated);
                                  }
                                } catch (e) { console.error(e); }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Hapus catatan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                      <tr>
                        <td colSpan={2} className="py-3 px-3 text-right text-gray-600 text-xs uppercase">Total Akumulasi</td>
                        <td className="py-3 px-3 text-right font-mono text-gray-900">{formatCurrency(selectedWorker.history.reduce((a,b)=>a+b.gross_salary,0))}</td>
                        <td className="py-3 px-3 text-right font-mono text-danger">-{formatCurrency(selectedWorker.history.reduce((a,b)=>a+b.tax_amount,0))}</td>
                        <td className="py-3 px-3 text-right font-mono text-success">{formatCurrency(selectedWorker.history.reduce((a,b)=>a+b.net_salary,0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
