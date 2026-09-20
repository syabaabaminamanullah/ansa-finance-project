import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BrainCircuit, 
  Building2, 
  Briefcase, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  Wallet, 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  Sliders,
  ArrowLeft,
  Coins,
  Repeat,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
  Download
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
} from 'recharts';
import { projectsApi, financialsApi, financeApi } from '../../../services/api';
import { useToastStore } from '../../../store/toastStore';
import { calculateSmartForecast } from '../utils/smartForecastEngine';
import type { HorizonType, SmartForecastResult } from '../utils/smartForecastEngine';
import { generateSmartForecastPDF } from '../utils/smartForecastPDF';

export function SmartForecastPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [coas, setCoas] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [arInvoices, setArInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Analysis Parameters
  const [selectedProjectId, setSelectedProjectId] = useState<string>(''); // '' = All Company
  const [horizon, setHorizon] = useState<HorizonType>('1_month');
  const [historicalMonthsRange, setHistoricalMonthsRange] = useState<number>(2);

  // Interactive Simulator adjustment percentage (-50% to +50%)
  const [opexAdjustPct, setOpexAdjustPct] = useState<number>(0);
  const [arRealizationPct, setArRealizationPct] = useState<number>(100);

  // Accordion toggle for One-Off isolated items
  const [showOneOffList, setShowOneOffList] = useState<boolean>(false);

  const addToast = useToastStore((state) => state.addToast);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [projRes, coasRes, jourRes, arRes] = await Promise.all([
        projectsApi.getProjects(),
        financialsApi.getCoas(),
        financeApi.getJournals(),
        financeApi.getArInvoices()
      ]);
      setProjects(projRes.data || []);
      setCoas(coasRes.data || []);
      setJournals(jourRes.data || []);
      setArInvoices(arRes.data || []);
    } catch (err) {
      console.error('Failed to load forecast data:', err);
      addToast('error', 'Gagal Memuat Data', 'Tidak dapat mengambil data jurnal dan proyek dari database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Base Model
  const forecast: SmartForecastResult = useMemo(() => {
    return calculateSmartForecast(
      journals,
      coas,
      projects,
      arInvoices,
      selectedProjectId,
      horizon,
      historicalMonthsRange
    );
  }, [journals, coas, projects, arInvoices, selectedProjectId, horizon, historicalMonthsRange]);

  // Apply Simulation adjustments
  const simulatedRequired = useMemo(() => {
    const adjustedOpex = forecast.projectedOpex * (1 + opexAdjustPct / 100);
    return forecast.projectedPayroll + adjustedOpex;
  }, [forecast, opexAdjustPct]);

  const simulatedInflow = useMemo(() => {
    return forecast.potentialInflow * (arRealizationPct / 100);
  }, [forecast, arRealizationPct]);

  const simulatedSurplusDeficit = forecast.currentCashBalance - simulatedRequired;
  const simulatedBurnRatePerDay = simulatedRequired / forecast.horizonDays;
  const simulatedRunwayDays = simulatedBurnRatePerDay > 0 ? Math.floor(forecast.currentCashBalance / simulatedBurnRatePerDay) : 999;

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const handleExportPDF = () => {
    try {
      const doc = generateSmartForecastPDF(forecast, {
        simulatedRequired,
        simulatedInflow,
        simulatedSurplusDeficit,
        simulatedBurnRatePerDay,
        simulatedRunwayDays,
      });

      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      addToast('success', 'Laporan Resmi Berhasil Dibuat', 'Laporan Proyeksi Kas & Ketahanan Finansial berhasil dicetak sesuai standar pelaporan korporat.');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      addToast('error', 'Gagal Cetak Laporan', 'Terjadi kesalahan teknis saat menyusun laporan PDF.');
    }
  };

  // Donut chart cleanly shows the 3 Operational Cadences
  const chartCadenceData = useMemo(() => {
    return forecast.cadenceGroups.map((group) => ({
      name: group.badge,
      fullName: group.title,
      value: group.projectedTotal,
      color: group.color,
    }));
  }, [forecast]);

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Back Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/finance"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary/20 text-textSecondary hover:text-textPrimary transition-all text-sm font-semibold shadow-2xs group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-primary" />
          <span>Kembali ke Finance Dashboard</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-textPrimary tracking-tight">Model Pintar Financial Report & Forecast</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-card shadow-xs">
                Formula COA Cadence
              </span>
            </div>
            <p className="text-sm text-textSecondary mt-0.5">
              Klasifikasi pintar 3 ritme operasional lapangan (Kasbon Site, Bulanan Pasti & Siklus Lapangan) dengan isolasi otomatis biaya satu kali (one-off).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-card hover:bg-background border border-border hover:border-primary/40 rounded-xl text-textSecondary hover:text-textPrimary text-xs font-medium transition-all shadow-2xs cursor-pointer"
            title="Muat ulang kalkulasi proyeksi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Download Laporan Proyeksi Smart Forecast (PDF)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Scope Selector */}
        <div>
          <label className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" /> Cakupan Entitas / Proyek
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Seluruh Perusahaan (Konsolidasi)</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
        </div>

        {/* 2. Forecast Horizon */}
        <div>
          <label className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" /> Horizon Waktu Proyeksi
          </label>
          <div className="grid grid-cols-4 gap-1.5 bg-background p-1 border border-border rounded-xl">
            {(['1_week', '2_weeks', '1_month', '3_months'] as HorizonType[]).map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  horizon === h 
                    ? 'bg-primary text-card shadow-xs' 
                    : 'text-textSecondary hover:text-textPrimary'
                }`}
              >
                {h === '1_week' && '1 Mgg'}
                {h === '2_weeks' && '2 Mgg'}
                {h === '1_month' && '1 Bln'}
                {h === '3_months' && '3 Bln'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Learning Window Range */}
        <div>
          <label className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" /> Basis Pembelajaran Historis
          </label>
          <select
            value={historicalMonthsRange}
            onChange={(e) => setHistoricalMonthsRange(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-semibold text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value={1}>1 Bulan Terakhir (Paling Terkini)</option>
            <option value={2}>2 Bulan Terakhir (Rata-rata Normal)</option>
            <option value={3}>3 Bulan Terakhir (Konservatif)</option>
          </select>
        </div>
      </div>

      {/* EXECUTIVE RUNWAY & STATUS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Live Cash Balances */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">Saldo Kas Tersedia</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-textPrimary mt-2 font-mono">
            {formatIDR(forecast.currentCashBalance)}
          </p>
          <p className="text-xs text-textSecondary mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Saldo buku besar kas & bank riil
          </p>
        </div>

        {/* Card 2: Projected Required with 3 Cadence breakdown */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">Kebutuhan Kas ({forecast.horizonLabel})</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2 font-mono">
            {formatIDR(simulatedRequired)}
          </p>
          <div className="text-[11px] text-textSecondary mt-1.5 space-y-0.5 border-t border-border/50 pt-1.5">
            <div className="flex justify-between">
              <span className="text-amber-600 font-semibold">Kasbon Site:</span>
              <span className="font-mono font-bold text-textPrimary">{formatIDR(forecast.projectedWeeklyKasbon)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-600 font-semibold">Bulanan/Gaji:</span>
              <span className="font-mono font-bold text-textPrimary">{formatIDR(forecast.projectedMonthlyFixed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600 font-semibold">Siklus Proyek:</span>
              <span className="font-mono font-bold text-textPrimary">{formatIDR(forecast.projectedCyclic)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Runway Survival Days */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">Ketahanan Kas (Cash Runway)</span>
            <div className={`p-2 rounded-xl ${
              simulatedRunwayDays >= forecast.horizonDays 
                ? 'bg-emerald-500/10 text-emerald-600' 
                : simulatedRunwayDays >= 14 
                ? 'bg-amber-500/10 text-amber-600' 
                : 'bg-rose-500/10 text-rose-600'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-black text-textPrimary font-mono">
              {simulatedRunwayDays}
            </p>
            <span className="text-sm font-bold text-textSecondary">Hari Bertahan</span>
          </div>
          <p className="text-xs text-textSecondary mt-1">
            Burn rate harian: <span className="font-semibold font-mono">{formatIDR(simulatedBurnRatePerDay)}/hari</span>
          </p>
        </div>

        {/* Card 4: Cash Adequacy Status */}
        <div className={`border rounded-2xl p-5 shadow-xs relative overflow-hidden ${
          simulatedSurplusDeficit >= 0 
            ? 'bg-emerald-500/5 border-emerald-500/30' 
            : 'bg-rose-500/5 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-textSecondary">Status Kecukupan Kas</span>
            {simulatedSurplusDeficit >= 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
          </div>
          <p className={`text-2xl font-black mt-2 font-mono ${
            simulatedSurplusDeficit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
          }`}>
            {simulatedSurplusDeficit >= 0 ? 'KAS MENCUKUPI' : 'DEFISIT KAS'}
          </p>
          <p className="text-xs font-bold mt-1">
            {simulatedSurplusDeficit >= 0 ? (
              <span className="text-emerald-600">Surplus: +{formatIDR(simulatedSurplusDeficit)}</span>
            ) : (
              <span className="text-rose-600">Kurang: {formatIDR(simulatedSurplusDeficit)}</span>
            )}
          </p>
        </div>
      </div>

      {/* CORE ANALYSIS: 3 COA CADENCE GROUPS + DONUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 3 Distinct Cadence Rhythm Containers */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
              <div>
                <h3 className="font-bold text-textPrimary text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> 3 Ritme Biaya Operasional (COA Cadence Engine)
                </h3>
                <p className="text-xs text-textSecondary mt-0.5">
                  Dikelompokkan secara terstruktur berdasarkan frekuensi pengeluaran riil lapangan dan akun Chart of Accounts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-secondary text-textSecondary">
                  Horizon: {forecast.horizonLabel}
                </span>
              </div>
            </div>

            {/* Render Each Cadence Group */}
            <div className="space-y-6">
              {forecast.cadenceGroups.map((group) => {
                const groupSharePct = forecast.projectedTotalRequired > 0 
                  ? (group.projectedTotal / forecast.projectedTotalRequired) * 100 
                  : 0;

                const isWeekly = group.id === 'WEEKLY_SITE';
                const isMonthly = group.id === 'MONTHLY_FIXED';
                const isCyclic = group.id === 'CYCLIC_PROJECT';

                const badgeBg = isWeekly 
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                  : isMonthly 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                  : 'bg-blue-500/10 text-blue-600 border-blue-500/20';

                const borderLeftColor = isWeekly 
                  ? 'border-l-amber-500' 
                  : isMonthly 
                  ? 'border-l-emerald-600' 
                  : 'border-l-blue-600';

                return (
                  <div 
                    key={group.id} 
                    className={`rounded-2xl border border-border bg-background/50 overflow-hidden border-l-4 ${borderLeftColor}`}
                  >
                    {/* Group Header */}
                    <div className="p-4 sm:p-5 bg-card border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {isWeekly && <Coins className="w-4 h-4 text-amber-500" />}
                          {isMonthly && <Building2 className="w-4 h-4 text-emerald-600" />}
                          {isCyclic && <Repeat className="w-4 h-4 text-blue-600" />}
                          <h4 className="font-bold text-textPrimary text-sm">{group.title}</h4>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase border ${badgeBg}`}>
                            {group.badge}
                          </span>
                        </div>
                        <p className="text-xs text-textSecondary">{group.description}</p>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <div className="flex items-baseline sm:justify-end gap-2">
                          <span className="text-lg font-black text-textPrimary font-mono">
                            {formatIDR(group.projectedTotal)}
                          </span>
                          <span className="text-xs font-bold text-textSecondary">
                            ({groupSharePct.toFixed(1)}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-textSecondary font-mono">
                          Basis Bulanan: {formatIDR(group.monthlyTotal)}
                        </p>
                      </div>
                    </div>

                    {/* Group Items Table / List */}
                    <div className="divide-y divide-border/60">
                      {group.items.map((item) => (
                        <div 
                          key={item.id}
                          className="p-3.5 sm:px-5 hover:bg-card/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.coaCode && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary/50 text-textSecondary border border-border">
                                  {item.coaCode}
                                </span>
                              )}
                              <span className="font-semibold text-textPrimary text-xs">{item.title}</span>
                            </div>
                            <p className="text-[11px] text-textSecondary">{item.subDesc}</p>
                            
                            {/* Real transaction sample tags */}
                            {item.samples && item.samples.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                <Tag className="w-2.5 h-2.5 text-textSecondary" />
                                <span className="text-[10px] text-textSecondary">Sampel:</span>
                                {item.samples.map((s, si) => (
                                  <span key={si} className="text-[10px] bg-card border border-border/80 px-1.5 py-0.2 rounded text-textPrimary">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-left sm:text-right shrink-0 sm:pl-4">
                            <p className="text-sm font-bold text-textPrimary font-mono">
                              {formatIDR(item.projectedAmount)}
                            </p>
                            <p className="text-[10px] text-textSecondary font-mono">
                              Basis/Bln: {formatIDR(item.monthlyAmount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Required Footer */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-textSecondary uppercase tracking-wide">Total Kebutuhan Kas Operasional</span>
                <p className="text-xs text-textSecondary">Selama {forecast.horizonLabel} (Semua 3 Ritme Lapangan)</p>
              </div>
              <p className="text-2xl font-black text-primary font-mono">
                {formatIDR(simulatedRequired)}
              </p>
            </div>
          </div>

          {/* ISOLATED ONE-OFF / MODAL AWAL ACCORDION */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
            <div 
              onClick={() => setShowOneOffList(!showOneOffList)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-textPrimary text-sm flex items-center gap-2">
                    Biaya Sekali Saja (One-Off / Belanja Modal) Diisolasi
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                      {forecast.oneOffItems.length} Transaksi
                    </span>
                  </h4>
                  <p className="text-xs text-textSecondary mt-0.5">
                    Total senilai <strong className="text-textPrimary font-mono">{formatIDR(forecast.historicalOneOffExpense)}</strong> dikeluarkan dari proyeksi bulanan agar tidak membengkak keliru.
                  </p>
                </div>
              </div>
              <button className="p-1 text-textSecondary hover:text-textPrimary">
                {showOneOffList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {showOneOffList && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="p-3 bg-background rounded-xl text-xs text-textSecondary flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Item di bawah ini meliputi DP Rig, Mobilisasi/Demobilisasi, Pembelian Besi/Baja PO-1, Persiapan Awal Proyek, dan pelunasan termin subkon masa lalu. Biaya ini tidak terjadi setiap bulan.
                  </span>
                </div>
                <div className="divide-y divide-border/60 max-h-64 overflow-y-auto pr-1">
                  {forecast.oneOffItems.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-textPrimary truncate">{item.desc}</p>
                        <p className="text-[10px] text-textSecondary">{item.date}</p>
                      </div>
                      <span className="font-mono font-bold text-textPrimary shrink-0">
                        {formatIDR(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Donut & AI Decomposition */}
        <div className="space-y-6">
          {/* Donut Distribution */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
            <h3 className="font-bold text-textPrimary text-base pb-3 border-b border-border mb-3">
              Komposisi 3 Ritme Beban
            </h3>
            <div className="h-[210px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartCadenceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="transparent"
                  >
                    {chartCadenceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => [formatIDR(val), 'Kebutuhan']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
                <span className="text-xs font-black text-textPrimary font-mono">
                  {formatIDR(simulatedRequired)}
                </span>
                <span className="text-[9px] font-bold text-textSecondary uppercase tracking-widest mt-0.5">
                  TOTAL BUTUH
                </span>
              </div>
            </div>

            {/* Legend with values */}
            <div className="mt-4 pt-3 border-t border-border space-y-2">
              {chartCadenceData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="font-semibold text-textPrimary">{d.name}</span>
                  </div>
                  <span className="font-mono font-bold text-textPrimary">{formatIDR(d.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Guidance Box */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-textPrimary text-sm flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" /> Standar Kasbon Lapangan
              </h4>
            </div>
            <p className="text-xs text-textSecondary leading-relaxed">
              Untuk kelancaran operasional di site bor, siapkan kasbon harian/mingguan (BBM Genset, makan mess tim, BBM kendaraan) sebesar{' '}
              <strong className="text-textPrimary font-mono">{formatIDR(forecast.projectedWeeklyKasbon)}</strong> setiap siklusnya untuk disalurkan ke admin site.
            </p>
          </div>
        </div>
      </div>

      {/* INTERACTIVE SCENARIO & RECOVERY SIMULATOR */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-border">
          <div>
            <h3 className="font-bold text-textPrimary text-lg flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" /> Simulator Skenario Arus Kas (What-If Analysis)
            </h3>
            <p className="text-xs text-textSecondary mt-0.5">
              Geser parameter untuk melihat bagaimana efisiensi belanja atau pencairan termin klien mempengaruhi ketahanan kas.
            </p>
          </div>
          <button
            onClick={() => { setOpexAdjustPct(0); setArRealizationPct(100); }}
            className="text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            Reset ke Data Awal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Slider 1: OPEX Adjustment */}
          <div className="space-y-3 bg-background/50 p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-textPrimary">Penyesuaian Biaya Operasional (OPEX)</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                opexAdjustPct < 0 ? 'bg-emerald-500/10 text-emerald-600' : opexAdjustPct > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-secondary text-textSecondary'
              }`}>
                {opexAdjustPct > 0 ? `+${opexAdjustPct}%` : `${opexAdjustPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              step="5"
              value={opexAdjustPct}
              onChange={(e) => setOpexAdjustPct(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-textSecondary">
              <span>Hemat 40%</span>
              <span>Baseline Transaksi</span>
              <span>Naik 40%</span>
            </div>
          </div>

          {/* Slider 2: AR Realization */}
          <div className="space-y-3 bg-background/50 p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-textPrimary">Tingkat Penagihan Piutang Termin (AR Inflow)</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                {arRealizationPct}% ({formatIDR(simulatedInflow)})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={arRealizationPct}
              onChange={(e) => setArRealizationPct(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-textSecondary">
              <span>0% (Tidak ada tagihan masuk)</span>
              <span>50%</span>
              <span>100% (Semua termin cair)</span>
            </div>
          </div>
        </div>

        {/* Simulation Outcome Highlight */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-card">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-textPrimary">Hasil Simulasi Strategis:</p>
              <p className="text-xs text-textSecondary mt-0.5">
                Dengan pengeluaran <strong className="text-textPrimary">{formatIDR(simulatedRequired)}</strong> dan potensi masuk termin{' '}
                <strong className="text-textPrimary">{formatIDR(simulatedInflow)}</strong>:
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-textSecondary uppercase font-bold tracking-wider">Proyeksi Saldo Akhir Periode</span>
            <p className={`text-2xl font-black font-mono ${
              forecast.currentCashBalance - simulatedRequired + simulatedInflow >= 0 
                ? 'text-emerald-600' 
                : 'text-rose-600'
            }`}>
              {formatIDR(forecast.currentCashBalance - simulatedRequired + simulatedInflow)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
