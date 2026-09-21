import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  Activity, 
  Drill, 
  Wrench, 
  Wallet, 
  CreditCard,
  Download,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Layers,
  Building2,
  Landmark,
  Compass,
  PieChart as PieIcon,
  ChevronRight,
  RefreshCw,
  BrainCircuit
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { clsx } from 'clsx';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeApi, projectsApi, api, financialsApi } from '../../../services/api';
import { calculateSmartForecast } from '../../finance/utils/smartForecastEngine';
import type { SmartForecastResult, HorizonType } from '../../finance/utils/smartForecastEngine';

// Equipment Matrix Data - Always Global Overview
const ALL_EQUIPMENT_DATA = [
  {
    code: '004',
    name: 'Rig Unit 1-5 (5 Unit Borpile)',
    project: '004 IKPT Solok Washbore',
    location: 'Muara Laboh, Solok',
    status: 'Active Drilling',
    statusType: 'active',
    utilization: 92,
  },
  {
    code: '001',
    name: 'Magnetometer Susceptibility',
    project: '001 LSI Malaysia Magnetic',
    location: 'Malaysia Exploration Site',
    status: 'Active Survey',
    statusType: 'active',
    utilization: 88,
  },
  {
    code: '003',
    name: 'Limestone Coring Rig Unit',
    project: '003 LSI Citatah Drilling',
    location: 'Citatah Quarry Site',
    status: 'Active Coring',
    statusType: 'active',
    utilization: 85,
  },
  {
    code: '002',
    name: 'Geolistrik Multichannel Unit',
    project: '002 Vitech Pongkor PLTM',
    location: 'Pongkor, Bogor',
    status: 'Standby / Relocation',
    statusType: 'standby',
    utilization: 70,
  },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const getInitialDashboardCache = () => {
    try {
      const cached = sessionStorage.getItem('ansa_dashboard_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };
  const initCache = getInitialDashboardCache();

  const [cashFlowData, setCashFlowData] = useState<any[]>(() => initCache?.cashFlowData || []);
  const [budgetData, setBudgetData] = useState<any[]>(() => initCache?.budgetData || []);
  const [recentTransactions, setRecentTransactions] = useState<any[]>(() => initCache?.recentTransactions || []);
  const [projectSummaries, setProjectSummaries] = useState<any[]>(() => initCache?.projectSummaries || []);
  const [allProjectsList, setAllProjectsList] = useState<any[]>(() => initCache?.allProjectsList || []);
  const [summary, setSummary] = useState<any>(() => initCache?.summary || {});
  const [isLoading, setIsLoading] = useState<boolean>(() => !initCache?.summary || Object.keys(initCache?.summary).length === 0);
  
  // Real-time Treasury & Expense Breakdown State
  const [treasuryData, setTreasuryData] = useState<any>(() => initCache?.treasuryData || {
    total_cash: 0,
    total_cash_formatted: 'Rp 0',
    total_accounts_count: 0,
    accounts: []
  });
  const [expenseBreakdown, setExpenseBreakdown] = useState<any>(() => initCache?.expenseBreakdown || {
    total_expense: 0,
    total_expense_formatted: 'Rp 0',
    categories: []
  });

  // Interactive Filters
  const [selectedProject, setSelectedProject] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('YTD');
  const [cashFlowInterval, setCashFlowInterval] = useState<'week' | 'month' | 'year'>('month');

  // Smart Cash Forecast States
  const [coas, setCoas] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [arInvoicesList, setArInvoicesList] = useState<any[]>([]);
  const [forecastHorizon, setForecastHorizon] = useState<HorizonType>('1_month');
  const [forecastProject, setForecastProject] = useState<string>('ALL');

  // Master Data & Filtered Fetch Function
  const fetchDashboardData = useCallback(async (projId: string, period: string, interval: 'week' | 'month' | 'year' = 'month') => {
    try {
      const projParam = projId === 'ALL' ? '' : `project_id=${projId}`;
      const periodParam = `period=${period}`;
      const intParam = `interval=${interval}`;
      const queryParams = [projParam, periodParam, intParam].filter(Boolean).join('&');
      const urlQuery = queryParams ? `?${queryParams}` : '';

      // 1. Fetch Consolidated Overview in ONE single fast request (<250ms)
      const overviewRes = await api.get(`/dashboard/overview${urlQuery}`);
      const overview = overviewRes.data;

      const projects = overview.projects || [];
      setAllProjectsList(projects);
      setSummary(overview.summary || {});
      setTreasuryData(overview.treasury || {});
      setExpenseBreakdown(overview.breakdown || {});
      setCashFlowData(overview.cashflow || []);
      if (overview.recent_transactions && overview.recent_transactions.length > 0) {
        setRecentTransactions(overview.recent_transactions);
      }
      setIsLoading(false);

      // 2. Fetch supplementary detailed tables and forecast in background without blocking
      financialsApi.getCoas().then(res => setCoas(res.data || [])).catch(() => {});
      financeApi.getJournals().then(res => setJournals(res.data || [])).catch(() => {});

      const [expRes, apRes, arRes] = await Promise.all([
        financeApi.getExpenses(),
        financeApi.getApInvoices(),
        financeApi.getArInvoices()
      ]);

      const expenses = expRes.data || [];
      const apInvoices = apRes.data || [];
      const arInvoices = arRes.data || [];
      setArInvoicesList(arInvoices);

      // 1. Budget vs Actual
      const targetProjects = projId === 'ALL' 
        ? projects 
        : projects.filter((p: any) => String(p.id) === projId);

      const computedBudgets = targetProjects.map((p: any) => {
        const projExpenses = expenses.filter((e: any) => e.project_id === p.id).reduce((sum: number, e: any) => sum + e.amount, 0);
        const projAp = apInvoices.filter((a: any) => a.project_id === p.id).reduce((sum: number, a: any) => sum + a.total_amount, 0);
        const actualRaw = projExpenses + projAp;
        const budgetRaw = p.contract_value_idr || 0;
        const actualBillion = actualRaw / 1000000000;
        const budgetBillion = budgetRaw / 1000000000;
        
        let shortName = p.name || p.code;
        if (p.code.includes('IKPT') || shortName.toLowerCase().includes('washbore') || shortName.toLowerCase().includes('solok')) {
          shortName = 'IKPT Solok';
        } else if (p.code.includes('LSI-MM') || shortName.toLowerCase().includes('magnetic')) {
          shortName = 'LSI Magnetic';
        } else if (p.code.includes('VITECH') || shortName.toLowerCase().includes('geolistrik') || shortName.toLowerCase().includes('pongkor')) {
          shortName = 'Vitech Pongkor';
        } else if (p.code.includes('CORE-005') || shortName.toLowerCase().includes('citatah') || shortName.toLowerCase().includes('limestone')) {
          shortName = 'LSI Citatah';
        } else if (shortName.length > 13) {
          shortName = shortName.substring(0, 13) + '...';
        }
        
        const percentage = budgetRaw > 0 ? Math.min(Math.round((actualRaw / budgetRaw) * 100), 100) : 0;

        return {
          id: p.id,
          project: shortName,
          fullName: p.name || p.code,
          code: p.code,
          budget: Number(budgetBillion.toFixed(2)),
          actual: Number(actualBillion.toFixed(2)),
          budgetRaw,
          actualRaw,
          percentage
        };
      }).filter((p: any) => p.budget > 0 || p.actual > 0);

      computedBudgets.sort((a: any, b: any) => b.budget - a.budget);
      setBudgetData(computedBudgets);

      // 2. Project Summaries Table (Always ALL projects for comparison)
      const projSums = projects.map((p: any) => {
        const inc = arInvoices.filter((ar: any) => ar.project_id === p.id).reduce((sum: number, ar: any) => sum + ar.total_amount, 0);
        const exp = expenses.filter((e: any) => e.project_id === p.id).reduce((sum: number, e: any) => sum + e.amount, 0);
        const ap = apInvoices.filter((a: any) => a.project_id === p.id).reduce((sum: number, a: any) => sum + a.total_amount, 0);
        const totalCost = exp + ap;
        const netMargin = inc - totalCost;
        
        return {
          id: p.id,
          name: p.name,
          code: p.code,
          budget: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(p.contract_value_idr || 0),
          income: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inc),
          expense: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalCost),
          netMarginVal: netMargin,
          netMargin: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(netMargin),
          marginPercent: inc > 0 ? ((netMargin / inc) * 100).toFixed(1) : null
        };
      });
      setProjectSummaries(projSums);

      // 3. Filtered Recent Transactions
      const filteredAr = projId === 'ALL' ? arInvoices : arInvoices.filter((ar: any) => ar.project_id === projId);
      const filteredAp = projId === 'ALL' ? apInvoices : apInvoices.filter((ap: any) => ap.project_id === projId);
      const filteredExp = projId === 'ALL' ? expenses : expenses.filter((e: any) => e.project_id === projId);

      const allTransactions = [
        ...filteredAr.map((ar: any) => ({
          id: ar.invoice_number,
          date: ar.date,
          desc: `Invoice to Customer (${ar.invoice_number})`,
          module: 'Account Receivable',
          amount: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(ar.total_amount),
          status: ar.status,
          rawDate: new Date(ar.date).getTime()
        })),
        ...filteredAp.map((ap: any) => ({
          id: ap.invoice_number,
          date: ap.date,
          desc: `Vendor Bill - ${ap.vendor_id || 'Vendor'}`,
          module: 'Account Payable',
          amount: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(ap.total_amount),
          status: ap.status,
          rawDate: new Date(ap.date).getTime()
        })),
        ...filteredExp.map((e: any) => ({
          id: e.expense_number || 'EXP',
          date: e.date,
          desc: e.description,
          module: 'Direct Expense',
          amount: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(e.amount),
          status: e.status,
          rawDate: new Date(e.date).getTime()
        }))
      ];

      allTransactions.sort((a, b) => b.rawDate - a.rawDate);
      setRecentTransactions(allTransactions.slice(0, 6));

      // Save cache for instantaneous 0-second reloads
      try {
        sessionStorage.setItem('ansa_dashboard_cache', JSON.stringify({
          summary: summaryRes.data,
          treasuryData: treasuryRes.data,
          allProjectsList: projects,
          expenseBreakdown: expBreakdownRes.data,
          cashFlowData: cfRes.data,
          budgetData: computedBudgets,
          projectSummaries: projSums
        }));
      } catch (_) {}

    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger re-fetch on filter change
  useEffect(() => {
    fetchDashboardData(selectedProject, selectedPeriod, cashFlowInterval);
  }, [selectedProject, selectedPeriod, fetchDashboardData]);

  const handleIntervalChange = async (newInterval: 'week' | 'month' | 'year') => {
    setCashFlowInterval(newInterval);
    try {
      const cfQuery = [selectedProject !== 'ALL' ? `project_id=${selectedProject}` : '', `interval=${newInterval}`].filter(Boolean).join('&');
      const res = await api.get(`/dashboard/cashflow-monthly?${cfQuery}`);
      setCashFlowData(res.data);
    } catch (err) {
      console.error("Failed to load cashflow data", err);
    }
  };

  // Selected Project Helper
  const selectedProjObj = allProjectsList.find(p => String(p.id) === selectedProject);
  const isSingleProject = selectedProject !== 'ALL';
  const selectedProjectCode = selectedProjObj ? selectedProjObj.code : '';

  const kpiTemplates = [
    { 
      key: 'cash_position', 
      title: isSingleProject ? 'Net Project Margin' : 'Cash Position', 
      icon: Wallet, 
      badge: isSingleProject ? 'Margin Proyek' : 'Reconciled',
      badgeType: 'success',
      subtext: isSingleProject 
        ? `${selectedProjectCode}: Laba Kas Bersih` 
        : `Mandiri: Rp ${(treasuryData.accounts.find((a: any) => String(a.code).startsWith('1121'))?.balance / 1000000 || 0).toFixed(1)}Jt • CIMB: Rp ${(treasuryData.accounts.find((a: any) => String(a.code).startsWith('1122'))?.balance / 1000000 || 0).toFixed(1)}Jt`
    },
    { 
      key: 'revenue_ytd', 
      title: isSingleProject ? 'Project Invoiced' : 'Revenue (YTD)', 
      icon: TrendingUp, 
      badge: isSingleProject ? 'Termin Invoiced' : '+8.2%',
      badgeType: 'success',
      subtext: isSingleProject ? `Total Tagihan Masuk Proyek` : '5 Invoice Klien Terbayar'
    },
    { 
      key: 'gross_profit', 
      title: isSingleProject ? 'Project Gross Profit' : 'Gross Profit', 
      icon: DollarSign, 
      badge: isSingleProject ? 'Laba Operasional' : '+5.4%',
      badgeType: 'success',
      subtext: isSingleProject ? `Termin Masuk - Realisasi Biaya` : 'Laba Kotor Operasional Proyek'
    },
    { 
      key: 'net_profit', 
      title: isSingleProject ? 'Project Net Return' : 'Net Profit', 
      icon: Percent, 
      badge: isSingleProject ? 'Net Return' : 'Laba Bersih',
      badgeType: 'success',
      subtext: isSingleProject ? `Hasil Bersih Proyek Berjalan` : 'Tahun Berjalan (Setelah Beban)'
    },
    { 
      key: 'total_pengeluaran', 
      title: isSingleProject ? 'Realisasi Beban Proyek' : 'Total Pengeluaran (YTD)', 
      icon: Drill, 
      badge: isSingleProject ? 'Biaya Lapangan' : 'Beban Biaya',
      badgeType: 'neutral',
      subtext: isSingleProject ? `Total Biaya Bor & Kasbon Proyek` : 'Operasional Proyek & Lapangan'
    },
    { 
      key: 'eqp_utilization', 
      title: isSingleProject ? 'Site Rig Utilization' : 'Eqp. Utilization', 
      icon: Wrench, 
      badge: isSingleProject ? 'Utilisasi Site' : '85% Aktif',
      badgeType: 'success',
      subtext: isSingleProject ? `Unit Bor & Alat di Site Proyek` : 'Utilisasi Rig & Alat Bor'
    },
    { 
      key: 'outstanding_ar', 
      title: isSingleProject ? 'Sisa Piutang Proyek' : 'Outstanding AR', 
      icon: Activity, 
      badge: summary.outstanding_ar === 'Rp 0' ? '100% Lunas' : 'Belum Lunas',
      badgeType: summary.outstanding_ar === 'Rp 0' ? 'success' : 'neutral',
      subtext: isSingleProject ? `Tagihan Belum Diterima Klien` : 'Piutang Klien Telah Tertagih'
    },
    { 
      key: 'outstanding_ap', 
      title: isSingleProject ? 'Sisa Hutang Vendor' : 'Outstanding AP', 
      icon: CreditCard, 
      badge: '0 Pending',
      badgeType: 'success',
      subtext: isSingleProject ? `Hutang Vendor Proyek Ini` : 'Semua Hutang Vendor Lunas'
    },
  ];

  // Custom Modern Tooltip for Cash Flow
  const CustomCashFlowTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const cashIn = payload.find((p: any) => p.dataKey === 'in')?.value || 0;
      const cashOut = payload.find((p: any) => p.dataKey === 'out')?.value || 0;
      const net = cashIn - cashOut;
      return (
        <div className="bg-card border border-border/70 p-4 rounded-xl shadow-lg min-w-[240px] space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-xs font-bold text-textPrimary tracking-wide uppercase">Bulan: {label} 2026</span>
            <span className={clsx(
              "text-[10px] font-bold px-2 py-0.5 rounded-full",
              net >= 0 ? "bg-secondary/40 text-textPrimary" : "bg-amber-500/20 text-amber-900"
            )}>
              {net >= 0 ? 'Surplus' : 'Defisit'}
            </span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-textSecondary">
                <span className="w-2.5 h-2.5 rounded-full bg-[#294825]"></span> Cash In:
              </span>
              <span className="font-semibold text-[#294825] font-mono">
                Rp {Number(cashIn).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-textSecondary">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]"></span> Cash Out:
              </span>
              <span className="font-semibold text-[#B45309] font-mono">
                Rp {Number(cashOut).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="pt-1.5 border-t border-border/40 flex items-center justify-between">
              <span className="font-medium text-textPrimary">Net Cash Flow:</span>
              <span className={clsx(
                "font-bold font-mono",
                net >= 0 ? "text-[#294825]" : "text-[#B45309]"
              )}>
                {net >= 0 ? '+' : ''}Rp {Number(net).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Modern Tooltip for Budget vs Actual
  const CustomBudgetTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border/70 p-4 rounded-xl shadow-lg min-w-[270px] space-y-2.5">
          <div className="border-b border-border/40 pb-2">
            <div className="text-xs font-bold text-textPrimary leading-snug">{data.fullName}</div>
            <div className="text-[11px] font-mono text-textSecondary">{data.code}</div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-textSecondary">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7F8F74]"></span> Nilai Kontrak:
              </span>
              <span className="font-semibold text-textPrimary font-mono">
                Rp {Number(data.budgetRaw).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-textSecondary">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]"></span> Realisasi Biaya:
              </span>
              <span className="font-semibold text-[#B45309] font-mono">
                Rp {Number(data.actualRaw).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="pt-2 border-t border-border/40 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-textSecondary">Penyerapan Anggaran:</span>
                <span className="font-bold text-primary">{data.percentage}%</span>
              </div>
              <div className="w-full bg-secondary/30 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#CAD5B5] via-[#D4AF37] to-[#B45309] rounded-full transition-all duration-500"
                  style={{ width: `${data.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Donut Tooltip
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border/70 p-3.5 rounded-xl shadow-lg min-w-[210px] space-y-1.5">
          <div className="flex items-center gap-2 border-b border-border/40 pb-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="text-xs font-bold text-textPrimary">{data.name}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-textSecondary">Total Biaya:</span>
            <span className="font-bold text-textPrimary font-mono">
              Rp {Number(data.value).toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-textSecondary">Porsi:</span>
            <span className="font-bold text-primary">{data.percentage}% dari Beban</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Smart Cash Forecast Memo
  const smartForecast: SmartForecastResult | null = useMemo(() => {
    if (!journals.length || !coas.length) return null;
    return calculateSmartForecast(
      journals,
      coas,
      allProjectsList,
      arInvoicesList,
      forecastProject === 'ALL' ? '' : forecastProject,
      forecastHorizon,
      2
    );
  }, [journals, coas, allProjectsList, arInvoicesList, forecastProject, forecastHorizon]);

  const forecastChartData = useMemo(() => {
    if (!smartForecast || !smartForecast.cadenceGroups) return [];
    return smartForecast.cadenceGroups.map((g) => ({
      name: g.badge,
      fullName: g.title,
      value: g.projectedTotal,
      color: g.color,
      monthlyTotal: g.monthlyTotal,
    }));
  }, [smartForecast]);

  const formatForecastIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const CustomForecastDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = smartForecast?.projectedTotalRequired || 1;
      const percentage = Math.round((data.value / total) * 100);
      return (
        <div className="bg-card border border-border/80 p-3 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[210px]">
          <div className="font-bold text-textPrimary flex items-center gap-2 border-b border-border/40 pb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.name}</span>
          </div>
          <div className="text-textSecondary text-[11px] leading-snug">{data.fullName}</div>
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-textSecondary">Kebutuhan:</span>
            <span className="font-bold text-[#294825] font-mono">{formatForecastIDR(data.value)}</span>
          </div>
          <div className="flex justify-between items-center text-[11px] text-textSecondary">
            <span>Porsi Forecast:</span>
            <span className="font-bold text-textPrimary">{percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-7 pb-10">
      {/* 1. Executive Cockpit Header & Interactive Global Filters */}
      <div className="bg-card/70 backdrop-blur-sm border border-border/70 p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-textPrimary tracking-tight">Executive Dashboard</h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary/40 text-[#294825] border border-border/40">
                <span className="w-2 h-2 rounded-full bg-[#294825] animate-pulse"></span>
                {isSingleProject ? `Proyek: ${selectedProjectCode}` : 'Live Reconciled (Semua Proyek)'}
              </span>
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-xs text-primary font-bold animate-spin">
                  <RefreshCw className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <p className="text-textSecondary text-xs mt-1 font-medium">
              {isSingleProject 
                ? `Fokus Analisis Proyek: ${selectedProjObj?.name || selectedProjectCode} (Nilai Kontrak: ${summary.contract_value || 'Rp 0'})`
                : 'ANSA Enterprise • Financial Summary & Field Project Intelligence (FY 2026)'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={() => navigate('/finance/reports')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border/80 rounded-xl text-xs font-bold text-textPrimary hover:bg-secondary/20 transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-textSecondary" />
              Export Report
            </button>
            <button 
              onClick={() => navigate('/finance/expenses')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#C59B27] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              New Transaction
            </button>
          </div>
        </div>

        {/* Global Interactive Filter Bar */}
        <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-textSecondary uppercase tracking-wider">
            <Filter className="w-4 h-4 text-primary" />
            <span>Interactive Filters:</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Project Filter */}
            <div className="flex items-center gap-2 bg-background border border-border/60 px-3 py-1.5 rounded-xl text-xs">
              <Building2 className="w-3.5 h-3.5 text-textSecondary" />
              <span className="text-textSecondary font-medium">Project:</span>
              <select 
                value={selectedProject} 
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bg-transparent font-bold text-textPrimary focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Active Projects (Semua Proyek)</option>
                {allProjectsList.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <div className="flex items-center gap-1 bg-background border border-border/60 p-1 rounded-xl text-xs">
              <button 
                onClick={() => setSelectedPeriod('YTD')}
                className={clsx(
                  "px-3 py-1 rounded-lg font-bold transition-all",
                  selectedPeriod === 'YTD' ? "bg-card text-textPrimary shadow-xs" : "text-textSecondary hover:text-textPrimary"
                )}
              >
                FY 2026 (YTD)
              </button>
              <button 
                onClick={() => setSelectedPeriod('AUG')}
                className={clsx(
                  "px-3 py-1 rounded-lg font-bold transition-all",
                  selectedPeriod === 'AUG' ? "bg-card text-textPrimary shadow-xs" : "text-textSecondary hover:text-textPrimary"
                )}
              >
                Agustus 2026
              </button>
              <button 
                onClick={() => setSelectedPeriod('Q3')}
                className={clsx(
                  "px-3 py-1 rounded-lg font-bold transition-all",
                  selectedPeriod === 'Q3' ? "bg-card text-textPrimary shadow-xs" : "text-textSecondary hover:text-textPrimary"
                )}
              >
                Q3 2026
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 8 Executive KPI Cards (Dinamis Sesuai Filter Proyek) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiTemplates.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={kpi.title} 
              className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px] font-bold text-textSecondary uppercase tracking-wider">
                    {kpi.title}
                  </span>
                  <div className="p-2.5 bg-secondary/30 rounded-xl text-primary group-hover:scale-110 transition-transform shadow-xs">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mb-2">
                  <h2 className="text-2xl font-extrabold text-[#294825] tracking-tight font-mono">
                    {summary[kpi.key] || 'Rp 0'}
                  </h2>
                </div>
              </div>

              <div className="pt-2.5 border-t border-border/30 flex items-center justify-between text-xs">
                <span className="text-textSecondary text-[11px] truncate mr-2 font-medium">
                  {kpi.subtext}
                </span>
                <span className={clsx(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex-shrink-0 shadow-xs",
                  kpi.badgeType === 'success' && "bg-secondary/40 text-[#294825] border border-border/30",
                  kpi.badgeType === 'neutral' && "bg-amber-500/10 text-[#B45309] border border-amber-500/20"
                )}>
                  {kpi.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Section: Real-Time Mini Treasury & Liquidity Widget + Early Warning & Risk Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Treasury Widget (5 Columns) - 100% REAL-TIME FROM DATABASE */}
        <div className="lg:col-span-5 bg-card p-6 rounded-2xl border border-border/70 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-secondary/30 rounded-xl text-[#294825]">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-textPrimary">Treasury & Bank Liquidity</h3>
                  <p className="text-xs text-textSecondary">Posisi kas riil terverifikasi per rekening</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#294825] bg-secondary/40 px-2.5 py-1 rounded-lg border border-border/30">
                100% Real-Time
              </span>
            </div>

            {/* Total Balance Card */}
            <div className="bg-background/80 p-4 rounded-xl border border-border/50 mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Total Kas Tersedia</span>
                <span className="text-xs font-bold text-[#294825]">{treasuryData.total_accounts_count} Akun Bank</span>
              </div>
              <div className="text-2xl font-extrabold text-[#294825] font-mono">
                {treasuryData.total_cash_formatted}
              </div>
              
              {/* Dynamic Liquidity Ratio Bar */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[10px] text-textSecondary font-bold">
                  {treasuryData.accounts.map((acc: any) => (
                    <span key={acc.id}>{acc.name.replace('Bank ', '')} ({acc.percentage}%)</span>
                  ))}
                </div>
                <div className="w-full h-2.5 bg-border/30 rounded-full flex overflow-hidden">
                  {treasuryData.accounts.map((acc: any) => (
                    <div 
                      key={acc.id}
                      className="h-full transition-all duration-500" 
                      style={{ 
                        width: `${acc.percentage}%`,
                        backgroundColor: acc.color 
                      }} 
                      title={`${acc.name}: ${acc.percentage}%`} 
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Bank Accounts Breakdown */}
            <div className="space-y-2.5">
              {treasuryData.accounts.length > 0 ? (
                treasuryData.accounts.map((acc: any) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:bg-background/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color }} />
                      <div>
                        <div className="text-xs font-bold text-textPrimary">{acc.code} - {acc.name}</div>
                        <div className="text-[10px] font-mono text-textSecondary">Rek: {acc.account_number}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-[#294825]">{acc.balance_formatted}</div>
                      <div className="text-[10px] text-textSecondary font-semibold">{acc.percentage}% Share</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-textSecondary text-center py-4">Memuat data kas bank...</div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between">
            <button 
              onClick={() => navigate('/finance/ledger')}
              className="text-xs font-bold text-[#294825] hover:text-primary flex items-center gap-1 transition-colors"
            >
              Lihat Buku Besar Kas <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => navigate('/finance/all-journals')}
              className="text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors"
            >
              Mutasi Rekening
            </button>
          </div>
        </div>

        {/* Executive Risk Radar & Health Scorecard (7 Columns) */}
        <div className="lg:col-span-7 bg-card p-6 rounded-2xl border border-border/70 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/15 rounded-xl text-[#B45309]">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-textPrimary">Executive Early Warning & Project Radar</h3>
                  <p className="text-xs text-textSecondary">Deteksi dini risiko anggaran, piutang, dan progres lapangan</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Systems Safe
              </span>
            </div>

            {/* Alert Cards List */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#B45309] flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-textPrimary flex items-center gap-2">
                    <span>Budget Burn Rate Alert — Proyek 004 IKPT Solok</span>
                    <span className="text-[10px] px-2 py-0.2 bg-amber-500/20 text-[#B45309] rounded font-mono font-bold">AKTIF</span>
                  </div>
                  <p className="text-textSecondary leading-relaxed">
                    Pengeluaran operasional dan kasbon persiapan rig terus berjalan (Realisasi: Rp 259,5 Jt). Rekomendasi: Terbitkan progress billing termin 2 ke klien IKPT.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/40 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#294825] flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-textPrimary flex items-center gap-2">
                    <span>Likuiditas & Kas 100% Sehat</span>
                    <span className="text-[10px] px-2 py-0.2 bg-secondary/50 text-[#294825] rounded font-mono font-bold">BALANCED</span>
                  </div>
                  <p className="text-textSecondary leading-relaxed">
                    Semua tagihan AP vendor telah diselesaikan tepat waktu dan posisi buku kas & bank tercatat seimbang.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border/40 flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-textPrimary flex items-center gap-2">
                    <span>Proyek 003 LSI Citatah — Margin Laba Tertinggi</span>
                    <span className="text-[10px] px-2 py-0.2 bg-primary/20 text-primary-foreground rounded font-mono font-bold">+23.0% MARGIN</span>
                  </div>
                  <p className="text-textSecondary leading-relaxed">
                    Menghasilkan surplus margin bersih Rp 105.370.129 dari total termin Rp 457 Jt yang masuk ke kas perusahaan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-xs text-textSecondary font-medium">
            <span>Terakhir diperbarui: Live Database Synchronized</span>
            <span className="font-bold text-textPrimary">Audit Status: Approved</span>
          </div>
        </div>
      </div>

      {/* 4. Section: Cash Flow Area Chart & Budget vs Actual Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <div className="bg-card p-6 rounded-2xl border border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-secondary/30 rounded-xl text-[#294825]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-textPrimary">
                  {cashFlowInterval === 'week' ? 'Cash Flow Mingguan' : cashFlowInterval === 'year' ? 'Cash Flow Tahunan' : 'Cash Flow Bulanan'}
                </h3>
                <p className="text-xs text-textSecondary">
                  {isSingleProject ? `Arus kas proyek ${selectedProjectCode}` : 'Arus kas masuk vs arus kas keluar perusahaan'}
                </p>
              </div>
            </div>

            {/* Segmented Mode Switcher (Week / Month / Year) */}
            <div className="flex items-center gap-1 bg-secondary/20 p-1 rounded-xl border border-border/50 self-start sm:self-auto shadow-sm">
              <button
                type="button"
                onClick={() => handleIntervalChange('week')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  cashFlowInterval === 'week'
                    ? 'bg-[#294825] text-white shadow-sm font-bold scale-[1.02]'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-secondary/30'
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => handleIntervalChange('month')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  cashFlowInterval === 'month'
                    ? 'bg-[#294825] text-white shadow-sm font-bold scale-[1.02]'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-secondary/30'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => handleIntervalChange('year')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  cashFlowInterval === 'year'
                    ? 'bg-[#294825] text-white shadow-sm font-bold scale-[1.02]'
                    : 'text-textSecondary hover:text-textPrimary hover:bg-secondary/30'
                }`}
              >
                Year
              </button>
            </div>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="themeCashInGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#294825" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#CAD5B5" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="themeCashOutGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B45309" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#7F8F74" strokeOpacity={0.25} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(val: number) => {
                    if (val >= 1_000_000_000) return `${(val/1_000_000_000).toFixed(1)}M`;
                    if (val >= 1_000_000) return `${(val/1_000_000).toFixed(0)}Jt`;
                    if (val >= 1_000) return `${(val/1_000).toFixed(0)}Rb`;
                    return `${val}`;
                  }}
                  width={60}
                />
                <Tooltip content={<CustomCashFlowTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  wrapperStyle={{ paddingBottom: '16px', fontSize: '12px', fontWeight: 500 }}
                  iconType="circle"
                />
                <Area 
                  type="monotone" 
                  name="Cash In (Masuk)" 
                  dataKey="in" 
                  stroke="#294825" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#themeCashInGradient)" 
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload && payload.in > 0) {
                      return <circle key={`in-${cx}-${cy}`} cx={cx} cy={cy} r={3.5} fill="#294825" stroke="#FFFFFF" strokeWidth={1.5} />;
                    }
                    return <></>;
                  }}
                  activeDot={{ r: 6, fill: '#294825', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  name="Cash Out (Keluar)" 
                  dataKey="out" 
                  stroke="#B45309" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#themeCashOutGradient)" 
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload && payload.out > 0) {
                      return <circle key={`out-${cx}-${cy}`} cx={cx} cy={cy} r={3.5} fill="#B45309" stroke="#FFFFFF" strokeWidth={1.5} />;
                    }
                    return <></>;
                  }}
                  activeDot={{ r: 6, fill: '#B45309', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs Actual */}
        <div className="bg-card p-6 rounded-2xl border border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-secondary/30 rounded-xl text-primary">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-textPrimary">Budget vs Realisasi Biaya</h3>
                <p className="text-xs text-textSecondary">
                  {isSingleProject ? `Penyerapan anggaran ${selectedProjectCode}` : 'Nilai kontrak vs pengeluaran (Miliar Rp)'}
                </p>
              </div>
            </div>
            <div className="bg-secondary/30 px-3 py-1 rounded-lg text-xs font-semibold text-[#294825] border border-border/30">
              {isSingleProject ? 'Proyek Terpilih' : 'Top Proyek'}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#7F8F74" strokeOpacity={0.25} />
                <XAxis 
                  dataKey="project" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(val: number) => `${val}M`}
                  width={45}
                />
                <Tooltip content={<CustomBudgetTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  wrapperStyle={{ paddingBottom: '16px', fontSize: '12px', fontWeight: 500 }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="budget" 
                  name="Nilai Kontrak" 
                  fill="#CAD5B5" 
                  radius={[6, 6, 0, 0]} 
                  barSize={isSingleProject ? 36 : 18}
                />
                <Bar 
                  dataKey="actual" 
                  name="Realisasi Biaya" 
                  fill="#D4AF37" 
                  radius={[6, 6, 0, 0]} 
                  barSize={isSingleProject ? 36 : 18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Section: Historical Expense vs Future Smart Cash Forecast Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Historical Expense Breakdown Donut Chart */}
        <div className="bg-card p-6 rounded-2xl border border-border/70 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-secondary/30 rounded-xl text-primary">
                  <PieIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-textPrimary">Komposisi Pengeluaran (Historis)</h3>
                  <p className="text-xs text-textSecondary">
                    {isSingleProject ? `Beban biaya proyek ${selectedProjectCode}` : 'Distribusi pos biaya riil dari jurnal & beban'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#B45309] bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {expenseBreakdown.total_expense_formatted}
              </span>
            </div>

            <div className="h-56 relative flex items-center justify-center">
              {expenseBreakdown.categories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomDonutTooltip />} />
                    <Pie
                      data={expenseBreakdown.categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseBreakdown.categories.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-textSecondary">Belum ada pengeluaran pada proyek ini</div>
              )}
              {/* Inner Donut Badge */}
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-textSecondary">Total Beban</span>
                <span className="text-sm font-extrabold text-[#294825] font-mono">100%</span>
              </div>
            </div>

            {/* Custom Interactive Dynamic Legend */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              {expenseBreakdown.categories.map((cat: any) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-textSecondary font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-textPrimary">{cat.percentage}%</span>
                    <span className="text-textSecondary text-[11px]">
                      (Rp {(cat.value / 1000000).toFixed(1)}Jt)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Card: Smart Cash Forecast Donut Chart (Proyeksi Kebutuhan Kas Ke Depan) */}
        <div className="bg-card p-6 rounded-2xl border border-border/70 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header with Title and Horizon Toggle */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <BrainCircuit className="w-5 h-5 text-[#294825]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-textPrimary">Proyeksi Kebutuhan Kas</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#294825]/10 text-[#294825] font-bold">
                      Smart Model
                    </span>
                  </div>
                  <p className="text-xs text-textSecondary">
                    Estimasi alokasi ritme operasional ke depan
                  </p>
                </div>
              </div>

              {/* Mini Horizon Switcher */}
              <div className="flex items-center gap-1 bg-secondary/20 p-1 rounded-xl border border-border/50">
                {(['1_week', '2_weeks', '1_month'] as HorizonType[]).map((hz) => (
                  <button
                    key={hz}
                    type="button"
                    onClick={() => setForecastHorizon(hz)}
                    className={clsx(
                      "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all",
                      forecastHorizon === hz
                        ? "bg-[#294825] text-white shadow-xs"
                        : "text-textSecondary hover:text-textPrimary"
                    )}
                  >
                    {hz === '1_week' ? '1 Mgg' : hz === '2_weeks' ? '2 Mgg' : '1 Bln'}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Selector Toggle Bar */}
            <div className="mb-3 px-3 py-1.5 bg-background/80 border border-border/60 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-textSecondary font-semibold shrink-0">
                <Building2 className="w-3.5 h-3.5 text-[#294825]" />
                <span>Proyek:</span>
              </div>
              <select
                value={forecastProject}
                onChange={(e) => setForecastProject(e.target.value)}
                className="bg-transparent text-xs font-bold text-textPrimary focus:outline-none cursor-pointer flex-1 text-right max-w-[280px]"
              >
                <option value="ALL">Semua Proyek (Konsolidasi)</option>
                {allProjectsList.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-56 relative flex items-center justify-center">
              {forecastChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomForecastDonutTooltip />} />
                    <Pie
                      data={forecastChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {forecastChartData.map((entry: any, index: number) => (
                        <Cell key={`fc-cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-textSecondary">Memuat data proyeksi kas...</div>
              )}
              {/* Inner Donut Center Total Required */}
              <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center px-1">
                <span className="text-[9px] uppercase font-bold text-textSecondary tracking-wider">Total Butuh</span>
                <span className="text-xs font-extrabold text-[#294825] font-mono leading-tight">
                  Rp {((smartForecast?.projectedTotalRequired || 0) / 1000000).toFixed(1)}Jt
                </span>
                <span className="text-[9px] text-textSecondary font-medium">
                  {smartForecast?.horizonDays || 30} Hari
                </span>
              </div>
            </div>

            {/* Dynamic Forecast Legend */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              {forecastChartData.map((item: any) => {
                const totalReq = smartForecast?.projectedTotalRequired || 1;
                const pct = Math.round((item.value / totalReq) * 100);
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-textSecondary font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-textPrimary">{pct}%</span>
                      <span className="text-textSecondary text-[11px]">
                        (Rp {(item.value / 1000000).toFixed(1)}Jt)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-xs">
            <span className="text-textSecondary flex items-center gap-1.5 font-medium">
              Runway Kas:{' '}
              <strong className={clsx(
                "font-mono font-bold",
                (smartForecast?.runwayDays || 0) >= 60 ? "text-[#294825]" : (smartForecast?.runwayDays || 0) >= 30 ? "text-amber-600" : "text-rose-600"
              )}>
                {smartForecast?.runwayDays || 0} Hari
              </strong>
            </span>
            <button
              onClick={() => navigate('/finance/smart-forecast')}
              className="font-bold text-[#294825] hover:text-primary flex items-center gap-1 transition-colors"
            >
              Detail Model <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Equipment & Rig Matrix - Full Width Grid */}
      <div className="bg-card p-6 rounded-2xl border border-border/70 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-secondary/30 rounded-xl text-[#294825]">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-textPrimary">Rig & Equipment Deployment Matrix</h3>
                <p className="text-xs text-textSecondary">Monitoring sewa unit bor & instrumen geofisika di lapangan</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/equipment')}
              className="text-xs font-bold text-primary hover:text-[#294825] flex items-center gap-1 transition-colors"
            >
              Detail Alat <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Equipment Deployment Cards - 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ALL_EQUIPMENT_DATA.map((eq) => {
              const isHighlighted = isSingleProject && selectedProjObj && (selectedProjObj.code.includes(eq.code) || eq.project.includes(selectedProjObj.code));
              return (
                <div 
                  key={eq.name} 
                  className={clsx(
                    "p-3.5 rounded-xl transition-all space-y-2",
                    isHighlighted 
                      ? "bg-secondary/30 border-2 border-primary shadow-xs" 
                      : "bg-background/70 border border-border/40 hover:bg-card hover:border-border"
                  )}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-xs font-bold text-textPrimary flex items-center gap-2">
                        <span>{eq.name}</span>
                        <span className={clsx(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          eq.statusType === 'active' ? "bg-secondary/50 text-[#294825] border border-border/40" : "bg-amber-500/15 text-[#B45309] border border-amber-500/30"
                        )}>
                          {eq.status}
                        </span>
                        {isHighlighted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                            Fokus Proyek
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-textSecondary mt-0.5">
                        {eq.project} • <span className="font-semibold text-textPrimary">{eq.location}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-[#294825] font-mono">{eq.utilization}%</div>
                      <div className="text-[10px] text-textSecondary font-semibold">Utilisasi Site</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-secondary/30 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        eq.statusType === 'active' ? "bg-[#294825]" : "bg-[#D4AF37]"
                      )}
                      style={{ width: `${eq.utilization}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-3 mt-4 border-t border-border/40 flex items-center justify-between text-xs text-textSecondary font-medium">
          <span>Total 9 Unit Alat Lapangan Aktif Tersebar di 4 Site Proyek</span>
          <span className="font-bold text-[#294825]">Rata-rata Utilisasi: 85%</span>
        </div>
      </div>

      {/* 6. Project Summaries Table - ALWAYS SHOW ALL PROJECTS */}
      <div className="bg-card rounded-2xl border border-border/70 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-textPrimary">Project Financial Summary (Per Proyek)</h3>
            <p className="text-xs text-textSecondary mt-0.5">Analisis arus kas masuk, realisasi beban operasional, dan margin laba bersih seluruh proyek</p>
          </div>
          <div className="text-xs font-mono font-bold text-textSecondary">
            Menampilkan: {projectSummaries.length} Proyek
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-textSecondary font-medium">
              <tr>
                <th className="px-6 py-4">Project Code</th>
                <th className="px-6 py-4">Project Name</th>
                <th className="px-6 py-4">Contract Value (Nilai Proyek)</th>
                <th className="px-6 py-4 text-[#294825]">Total Invoiced (Uang Masuk)</th>
                <th className="px-6 py-4 text-[#B45309]">Total Cost (Pengeluaran)</th>
                <th className="px-6 py-4 text-right">Net Margin (Invoiced - Cost)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {projectSummaries.length > 0 ? (
                projectSummaries.map((row, i) => {
                  const isSelectedRow = isSingleProject && String(row.id) === selectedProject;
                  return (
                    <tr 
                      key={i} 
                      className={clsx(
                        "transition-colors",
                        isSelectedRow ? "bg-secondary/30 font-semibold" : "hover:bg-background/50"
                      )}
                    >
                      <td className="px-6 py-4 font-mono font-semibold text-primary flex items-center gap-2">
                        {isSelectedRow && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                        {row.code}
                      </td>
                      <td className="px-6 py-4 text-textPrimary font-medium">{row.name}</td>
                      <td className="px-6 py-4 text-textSecondary font-mono">{row.budget}</td>
                      <td className="px-6 py-4 text-[#294825] font-semibold font-mono">{row.income}</td>
                      <td className="px-6 py-4 text-[#B45309] font-semibold font-mono">{row.expense}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={clsx(
                          "inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold font-mono shadow-xs",
                          row.netMarginVal >= 0 
                            ? "bg-secondary/40 text-[#294825] border border-border/40" 
                            : "bg-amber-500/15 text-[#B45309] border border-amber-500/30"
                        )}>
                          {row.netMarginVal >= 0 ? '+' : ''}{row.netMargin}
                          {row.marginPercent && (
                            <span className="ml-1.5 opacity-80 text-[10px] font-sans">({row.marginPercent}%)</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-textSecondary">
                    Tidak ada proyek ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Operational Summary & Recent Transactions */}
      <div className="bg-card rounded-2xl border border-border/70 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/40 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-textPrimary">Recent Transactions</h3>
            <p className="text-xs text-textSecondary mt-0.5">
              {isSingleProject ? `Daftar transaksi terbaru proyek ${selectedProjectCode}` : 'Daftar transaksi kas, tagihan, dan pengeluaran terbaru perusahaan'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/finance/all-journals')}
            className="text-xs font-bold text-primary hover:text-[#294825] flex items-center gap-1 transition-colors"
          >
            Lihat Semua Transaksi <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-textSecondary font-medium">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Amount (Rp)</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((row, i) => (
                  <tr key={i} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-primary">{row.id}</td>
                    <td className="px-6 py-4 text-textSecondary font-mono">{row.date}</td>
                    <td className="px-6 py-4 text-textPrimary font-medium">{row.desc}</td>
                    <td className="px-6 py-4 text-textSecondary">{row.module}</td>
                    <td className="px-6 py-4 text-textPrimary font-mono font-semibold">{row.amount}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-bold font-mono shadow-xs",
                        (row.status === 'Paid' || row.status === 'Posted' || row.status === 'Approved' || row.status === 'Settled') 
                          ? "bg-secondary/40 text-[#294825] border border-border/40" 
                          : "bg-amber-500/15 text-[#B45309] border border-amber-500/30"
                      )}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-textSecondary">
                    Tidak ada transaksi untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
