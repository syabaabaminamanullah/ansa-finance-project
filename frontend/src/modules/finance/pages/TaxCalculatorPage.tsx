import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, AlertCircle, Info, FileText, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import { TaxWorkerManager } from '../components/TaxWorkerManager';

export function TaxCalculatorPage() {
  const [activeTab, setActiveTab] = useState<'pph21' | 'ppn23' | 'pph42' | 'hr'>('pph21');

  // PPh 21 State
  const [calculationMethod, setCalculationMethod] = useState<'gross' | 'net'>('gross');
  const [grossSalary, setGrossSalary] = useState<number>(0);
  const [ptkpStatus, setPtkpStatus] = useState<string>('TK/0');
  const [hasNpwp, setHasNpwp] = useState<boolean>(true);

  // PPN & PPh 23 State
  const [dppValue, setDppValue] = useState<number>(0);
  const [isIncludePpn, setIsIncludePpn] = useState<boolean>(false);
  const [ppnRate, setPpnRate] = useState<number>(11);
  const [pph23Rate, setPph23Rate] = useState<number>(2);
  const [vendorHasNpwp, setVendorHasNpwp] = useState<boolean>(true);

  // PPh 4(2) State
  const [rentValue, setRentValue] = useState<number>(0);
  const [pph42Rate, setPph42Rate] = useState<number>(10);

  // === PPh 21 Calculator (Simplified TER 2024 approximation or standard rules) ===
  const pph21Result = useMemo(() => {
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

      const taxMonthly = taxYearly / 12;
      const takeHomePay = grossMonthly - taxMonthly;

      return { grossMonthly, ptkpYearly, pkp, taxYearly, taxMonthly, takeHomePay };
    };

    if (calculationMethod === 'gross') {
      return calculateTax(grossSalary, ptkpStatus, hasNpwp);
    } else {
      // Net to Gross (Gross-Up via Bisection)
      const targetTHP = grossSalary;
      if (targetTHP <= 0) return calculateTax(0, ptkpStatus, hasNpwp);
      
      let low = targetTHP;
      let high = targetTHP * 2; // Asumsi THP maksimal terpotong pajak 50%
      let mid = low;
      
      for (let i = 0; i < 60; i++) {
        mid = (low + high) / 2;
        const calc = calculateTax(mid, ptkpStatus, hasNpwp);
        
        if (Math.abs(calc.takeHomePay - targetTHP) < 1) break;
        
        if (calc.takeHomePay < targetTHP) {
          low = mid;
        } else {
          high = mid;
        }
      }
      
      return calculateTax(mid, ptkpStatus, hasNpwp);
    }
  }, [grossSalary, ptkpStatus, hasNpwp, calculationMethod]);

  // === PPN & PPh 23 Calculator ===
  const ppn23Result = useMemo(() => {
    let dpp = dppValue;
    if (isIncludePpn) {
      // Jika harga sudah termasuk PPN (misal 11%), DPP = Harga / 1.11
      dpp = dppValue / (1 + (ppnRate / 100));
    }
    
    const ppnAmount = dpp * (ppnRate / 100);
    const actualPph23Rate = vendorHasNpwp ? (pph23Rate / 100) : (pph23Rate / 100 * 2); // 100% lebih tinggi jika non-NPWP
    const pph23Amount = dpp * actualPph23Rate;
    
    const invoiceTotal = dpp + ppnAmount;
    const amountToPayVendor = invoiceTotal - pph23Amount;

    return { dpp, ppnAmount, pph23Amount, actualPph23Rate, invoiceTotal, amountToPayVendor };
  }, [dppValue, isIncludePpn, ppnRate, pph23Rate, vendorHasNpwp]);

  // === PPh 4(2) Final Calculator ===
  const pph42Result = useMemo(() => {
    const taxAmount = rentValue * (pph42Rate / 100);
    const netToPay = rentValue - taxAmount;
    return { taxAmount, netToPay };
  }, [rentValue, pph42Rate]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link to="/finance" className="p-2 border border-border rounded-lg text-textSecondary hover:bg-background hover:text-textPrimary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" />
            Kalkulator Pajak (Simulasi)
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
            <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
            <span>/</span>
            <span className="text-primary font-medium">Kalkulator Pajak</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-textSecondary text-sm">
          Gunakan fitur ini untuk mensimulasikan perhitungan potongan pajak (PPh 21, PPh 23, PPN, dan PPh 4 ayat 2 Final).
        </p>
      </div>

      <div className="flex space-x-1 bg-background/50 p-1 rounded-lg border border-border w-fit">
        <button
          onClick={() => setActiveTab('hr')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'hr' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:bg-background'
          }`}
        >
          Pengelola Pekerja (HR)
        </button>
        <button
          onClick={() => setActiveTab('pph21')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'pph21' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:bg-background'
          }`}
        >
          PPh 21 (Gaji/Upah)
        </button>
        <button
          onClick={() => setActiveTab('ppn23')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'ppn23' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:bg-background'
          }`}
        >
          PPN & PPh 23 (Jasa)
        </button>
        <button
          onClick={() => setActiveTab('pph42')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'pph42' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:bg-background'
          }`}
        >
          PPh 4(2) Final
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        {/* TAB PPH 21 */}
        {activeTab === 'pph21' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> Parameter Gaji
              </h3>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="calcMethod"
                    value="gross"
                    checked={calculationMethod === 'gross'}
                    onChange={() => setCalculationMethod('gross')}
                    className="text-primary focus:ring-primary"
                  />
                  Hitung dari Bruto
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="calcMethod"
                    value="net"
                    checked={calculationMethod === 'net'}
                    onChange={() => setCalculationMethod('net')}
                    className="text-primary focus:ring-primary"
                  />
                  Gross-Up (Dari THP)
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  {calculationMethod === 'gross' ? 'Gaji Pokok / Penghasilan Bruto (Per Bulan)' : 'Target Take Home Pay (THP) / Gaji Bersih'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary">Rp</span>
                  <input
                    type="number"
                    value={grossSalary || ''}
                    onChange={(e) => setGrossSalary(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Contoh: 10000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Status PTKP (Tanggungan)</label>
                <select
                  value={ptkpStatus}
                  onChange={(e) => setPtkpStatus(e.target.value)}
                  className="w-full p-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="TK/0">TK/0 - Tidak Kawin, 0 Tanggungan (Rp 54 Jt)</option>
                  <option value="TK/1">TK/1 / K/0 - 1 Tanggungan (Rp 58.5 Jt)</option>
                  <option value="TK/2">TK/2 / K/1 - 2 Tanggungan (Rp 63 Jt)</option>
                  <option value="TK/3">TK/3 / K/2 - 3 Tanggungan (Rp 67.5 Jt)</option>
                  <option value="K/3">K/3 - Kawin, 3 Tanggungan (Rp 72 Jt)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasNpwp"
                  checked={hasNpwp}
                  onChange={(e) => setHasNpwp(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                />
                <label htmlFor="hasNpwp" className="text-sm font-medium text-textPrimary">
                  Karyawan Memiliki NPWP
                </label>
              </div>

              {!hasNpwp && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Tanpa NPWP, tarif pajak yang dikenakan <strong>20% lebih tinggi</strong> dari tarif normal.</p>
                </div>
              )}
            </div>

            <div className="bg-background rounded-xl p-6 border border-border space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Hasil Perhitungan Estimasi</h3>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary">Penghasilan Bruto (Bulanan):</span>
                <span className="font-semibold">{formatCurrency(pph21Result.grossMonthly)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary">Status PTKP Tahunan:</span>
                <span className="font-medium">{ptkpStatus} ({formatCurrency(pph21Result.ptkpYearly)})</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary">PKP (Penghasilan Kena Pajak) Tahunan:</span>
                <span className="font-medium">{formatCurrency(pph21Result.pkp)}</span>
              </div>
              
              <div className="h-px bg-border my-4"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-textSecondary font-medium">Pajak PPh 21 (Bulanan):</span>
                <span className="font-bold text-red-600 text-lg">- {formatCurrency(pph21Result.taxMonthly)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-textSecondary font-medium">Pajak PPh 21 (Tahunan):</span>
                <span className="font-semibold text-red-600">- {formatCurrency(pph21Result.taxYearly)}</span>
              </div>
              
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-primary">Take Home Pay (THP) / Bln:</span>
                  <span className="font-bold text-primary text-xl">{formatCurrency(pph21Result.takeHomePay)}</span>
                </div>
              </div>

              <div className="flex gap-2 items-start text-xs text-textSecondary mt-2">
                <Info className="w-4 h-4 shrink-0" />
                <p>Catatan: Perhitungan ini merupakan estimasi PPh 21 berdasarkan tarif Pasal 17 ayat (1) huruf a UU HPP. Perhitungan belum mencakup BPJS Ketenagakerjaan/Kesehatan yang dibayar karyawan/perusahaan.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB PPN & PPh 23 */}
        {activeTab === 'ppn23' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> Parameter Nilai Jasa
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Nilai Tagihan / Dasar Pengenaan Pajak (DPP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary">Rp</span>
                  <input
                    type="number"
                    value={dppValue || ''}
                    onChange={(e) => setDppValue(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Contoh: 50000000"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="includePpn"
                  checked={isIncludePpn}
                  onChange={(e) => setIsIncludePpn(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                />
                <label htmlFor="includePpn" className="text-sm font-medium text-textPrimary">
                  Nilai di atas sudah termasuk PPN (Include PPN)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Tarif PPN (%)</label>
                  <select
                    value={ppnRate}
                    onChange={(e) => setPpnRate(Number(e.target.value))}
                    className="w-full p-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="11">11% (Mulai 2022)</option>
                    <option value="12">12% (Mulai 2025)</option>
                    <option value="0">0% (Bebas PPN / Non-PKP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Tarif PPh 23 Dasar (%)</label>
                  <select
                    value={pph23Rate}
                    onChange={(e) => setPph23Rate(Number(e.target.value))}
                    className="w-full p-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="2">2% (Sewa & Jasa Lainnya)</option>
                    <option value="15">15% (Dividen, Bunga, Royalti)</option>
                    <option value="0">0% (Tidak dipotong)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="vendorNpwp"
                  checked={vendorHasNpwp}
                  onChange={(e) => setVendorHasNpwp(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                />
                <label htmlFor="vendorNpwp" className="text-sm font-medium text-textPrimary">
                  Vendor/Penyedia Jasa Memiliki NPWP
                </label>
              </div>
              {!vendorHasNpwp && pph23Rate > 0 && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Tanpa NPWP, tarif PPh 23 dipotong <strong>100% lebih tinggi</strong> (menjadi {pph23Rate * 2}%).</p>
                </div>
              )}
            </div>

            <div className="bg-background rounded-xl p-6 border border-border space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Hasil Perhitungan Invoice & Pajak</h3>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary">Dasar Pengenaan Pajak (DPP):</span>
                <span className="font-semibold">{formatCurrency(ppn23Result.dpp)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary">PPN ({ppnRate}%):</span>
                <span className="font-semibold text-green-600">+ {formatCurrency(ppn23Result.ppnAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary font-medium">Total Invoice (DPP + PPN):</span>
                <span className="font-bold">{formatCurrency(ppn23Result.invoiceTotal)}</span>
              </div>

              <div className="h-px bg-border my-4"></div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary">Potongan PPh 23 ({(ppn23Result.actualPph23Rate * 100).toFixed(1)}%):</span>
                <span className="font-semibold text-red-600">- {formatCurrency(ppn23Result.pph23Amount)}</span>
              </div>
              
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-primary">Jumlah Dibayar ke Vendor:</span>
                  <span className="font-bold text-primary text-xl">{formatCurrency(ppn23Result.amountToPayVendor)}</span>
                </div>
                <p className="text-xs text-primary/70 mt-1">Total Invoice - PPh 23</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB PPh 4(2) */}
        {activeTab === 'pph42' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> Parameter Nilai Objek
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Nilai Persewaan / Jasa Konstruksi (DPP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary">Rp</span>
                  <input
                    type="number"
                    value={rentValue || ''}
                    onChange={(e) => setRentValue(Number(e.target.value))}
                    className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Contoh: 100000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Objek PPh Final & Tarif</label>
                <select
                  value={pph42Rate}
                  onChange={(e) => setPph42Rate(Number(e.target.value))}
                  className="w-full p-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                  <option value="10">10% - Persewaan Tanah dan/atau Bangunan</option>
                  <option value="1.75">1.75% - Pelaksana Konstruksi (Kualifikasi Kecil)</option>
                  <option value="2.65">2.65% - Pelaksana Konstruksi (Kualifikasi Menengah/Besar)</option>
                  <option value="4">4% - Pelaksana Konstruksi (Tanpa Kualifikasi)</option>
                  <option value="3.5">3.5% - Konsultan / Perencana / Pengawas Konstruksi (Memiliki Kualifikasi)</option>
                  <option value="6">6% - Konsultan / Perencana Konstruksi (Tanpa Kualifikasi)</option>
                  <option value="0.5">0.5% - UMKM (PP 55/2022)</option>
                </select>
              </div>
            </div>

            <div className="bg-background rounded-xl p-6 border border-border space-y-4">
              <h3 className="font-semibold text-lg border-b border-border pb-2">Hasil Potongan PPh Final</h3>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary">Dasar Pengenaan Pajak (DPP):</span>
                <span className="font-semibold">{formatCurrency(rentValue)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-textSecondary">Potongan PPh Pasal 4 ayat (2) ({pph42Rate}%):</span>
                <span className="font-semibold text-red-600">- {formatCurrency(pph42Result.taxAmount)}</span>
              </div>
              
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-primary">Jumlah Pembayaran Bersih:</span>
                  <span className="font-bold text-primary text-xl">{formatCurrency(pph42Result.netToPay)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB HR / PENGELOLA PEKERJA */}
        {activeTab === 'hr' && (
          <TaxWorkerManager />
        )}
      
      <div className="mt-8 bg-blue-50/50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Buku Panduan Pajak & Jurnal Coreterra
        </h2>
        
        <div className="space-y-6 text-sm text-slate-700">
          {/* Section 1 */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">1. Kamus Singkat Pajak Bisnis Anda</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>PPN Masukan (12%):</strong> Muncul saat membayar vendor yang sudah PKP. Karena Coreterra <strong>Non-PKP</strong>, PPN ini <strong>TIDAK BISA</strong> diklaim. Langsung catat PPN ini menyatu sebagai <span className="font-medium">Biaya Proyek / Material</span>.</li>
              <li><strong>PPN Keluaran:</strong> Utang Pajak. Karena Coreterra <strong>Non-PKP</strong>, PPN Keluaran Anda selalu <strong>Rp 0</strong>.</li>
              <li><strong>PPh Pasal 23:</strong> Potongan pajak jasa korporasi / sewa alat. Tarif standar <strong>2%</strong>. (COA: <span className="text-blue-700 font-mono">21203 - Hutang PPh Pasal 23</span>).</li>
              <li><strong>PPh Pasal 4 ayat (2) Final:</strong> Potongan pajak khusus Jasa Konstruksi. Tarif <strong>1,75%</strong> (SBU Kecil). (COA: <span className="text-blue-700 font-mono">11600 - Pajak Dibayar Dimuka</span> saat dipotong klien).</li>
              <li><strong>PPh Pasal 21:</strong> Potongan atas Gaji/Upah perorangan. Bebas pajak jika di bawah PTKP. (COA: <span className="text-blue-700 font-mono">21202 - Hutang PPh Pasal 21</span>).</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2">2. Panduan Alur Dokumen & Jurnal di Web Aplikasi</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="bg-white border border-slate-200 p-4 rounded-md">
                <h4 className="font-medium text-slate-800 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  A. Sisi Belanja ke Vendor (Procure-to-Pay)
                </h4>
                <p className="text-xs text-slate-500 mb-2">Contoh: Jasa Rebar PT UAP (Harga Jasa 66 Juta + PPN 12%)</p>
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <p className="font-sans font-medium text-slate-700">Fase 1: Terima Tagihan (Menu AP Invoices)</p>
                    <p className="text-slate-600">[Debit] 51100 Biaya Subkontraktor = 73.920.000 <span className="font-sans italic text-slate-400">*(66 Juta + PPN dilebur jadi biaya)</span></p>
                    <p className="text-slate-600">[Kredit] 21100 Hutang Usaha (AP) = 73.920.000</p>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-slate-700">Fase 2: Bayar (Menu Payment)</p>
                    <p className="text-slate-600">[Debit] 21100 Hutang Usaha (AP) = 73.920.000</p>
                    <p className="text-slate-600 pl-4">[Kredit] 21203 Hutang PPh Pasal 23 = 1.320.000 <span className="font-sans italic text-slate-400">*(2% dari 66 Juta)</span></p>
                    <p className="text-slate-600 pl-4">[Kredit] 11210 Bank Mandiri IDR = 72.600.000 <span className="font-sans italic text-slate-400">*(Uang riil keluar)</span></p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-md">
                <h4 className="font-medium text-slate-800 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  B. Sisi Menagih ke Klien (Order-to-Cash)
                </h4>
                <p className="text-xs text-slate-500 mb-2">Contoh: Tagih Proyek ke PT SMI (625 Juta)</p>
                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <p className="font-sans font-medium text-slate-700">Fase 1: Kirim Invoice Termin</p>
                    <p className="text-slate-600">[Debit] 11300 Piutang Usaha (AR) = 625.000.000</p>
                    <p className="text-slate-600">[Kredit] 40000 Pendapatan Proyek = 625.000.000</p>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-slate-700">Fase 2: Terima Pembayaran</p>
                    <p className="text-slate-600">[Debit] 11210 Bank Mandiri IDR = 614.062.500 <span className="font-sans italic text-slate-400">*(Uang riil masuk)</span></p>
                    <p className="text-slate-600">[Debit] 11600 Pajak Dibayar Dimuka = 10.937.500 <span className="font-sans italic text-slate-400">*(Bukti PPh 4(2) 1.75%)</span></p>
                    <p className="text-slate-600 pl-4">[Kredit] 11300 Piutang Usaha (AR) = 625.000.000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-1">
              <span className="text-amber-500">⭐</span> Golden Rules (Aturan Emas Administrasi)
            </h3>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-900">
              <ol className="list-decimal pl-4 space-y-2">
                <li><strong>Jika Kita Memotong Pajak Vendor (PPh 23):</strong> Kita wajib membuatkan Bukti Potong Elektronik via e-Bupot Unifikasi di DJP Online paling lambat akhir bulan, lalu kirim PDF-nya ke vendor. Jangan lupa setor uangnya pakai Kode Billing!</li>
                <li><strong>Jika Klien Memotong Pajak Kita (PPh Final):</strong> Kita wajib menagih/meminta lembar Bukti Potong PPh Pasal 4 ayat (2) kepada klien (PT SMI) setelah mereka transfer, karena itu adalah "surat sakti" pengurang Pajak Tahunan Coreterra.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

    </div>
    </div>
  );
}
