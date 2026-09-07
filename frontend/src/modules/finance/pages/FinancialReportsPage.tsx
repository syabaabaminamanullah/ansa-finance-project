import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download, Calendar, Filter, BarChart3, TrendingUp, Wallet, Landmark, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToastStore } from '../../../store/toastStore';
import { generateSingleReportPDF, generateConsolidatedReportPDF } from '../utils/pdfGenerator';

const getWeekLabel = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `Minggu: ${monday.toLocaleDateString('id-ID', options)}`;
};

const formatCurrencyStatic = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val || 0);
};

const HierarchicalCashFlowTable = ({ details }: { details: any[] }) => {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  if (!details || details.length === 0) return null;

  const hierarchy: Record<string, any> = {};
  details.forEach(detail => {
    const proj = detail.project || 'Umum / Lainnya';
    const week = getWeekLabel(detail.date);
    
    if (!hierarchy[proj]) hierarchy[proj] = { inflow: 0, outflow: 0, net: 0, weeks: {} };
    if (!hierarchy[proj].weeks[week]) hierarchy[proj].weeks[week] = { inflow: 0, outflow: 0, net: 0, transactions: [] };
    
    const amt = detail.amount;
    if (detail.type === 'inflow') {
      hierarchy[proj].inflow += amt;
      hierarchy[proj].weeks[week].inflow += amt;
    } else {
      hierarchy[proj].outflow += amt;
      hierarchy[proj].weeks[week].outflow += amt;
    }
    hierarchy[proj].net = hierarchy[proj].inflow - hierarchy[proj].outflow;
    hierarchy[proj].weeks[week].net = hierarchy[proj].weeks[week].inflow - hierarchy[proj].weeks[week].outflow;
    hierarchy[proj].weeks[week].transactions.push(detail);
  });

  const toggleProject = (p: string) => setExpandedProjects(prev => ({ ...prev, [p]: !prev[p] }));
  const toggleWeek = (key: string) => setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="bg-background border-t border-border">
      {Object.entries(hierarchy).map(([projName, projData]) => (
        <div key={projName} className="border-b border-border last:border-b-0">
          <div 
            className="flex items-center justify-between p-3 hover:bg-card cursor-pointer"
            onClick={() => toggleProject(projName)}
          >
            <div className="flex items-center gap-2">
              {expandedProjects[projName] ? <ChevronDown className="w-4 h-4 text-textSecondary" /> : <ChevronRight className="w-4 h-4 text-textSecondary" />}
              <span className="font-bold text-textPrimary">{projName}</span>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="text-success">+{formatCurrencyStatic(projData.inflow)}</span>
              <span className="text-danger">-{formatCurrencyStatic(projData.outflow)}</span>
            </div>
          </div>
          
          {expandedProjects[projName] && (
            <div className="pl-6 bg-card/50">
              {Object.entries(projData.weeks).map(([weekLabel, weekData]: [string, any]) => {
                const weekKey = `${projName}-${weekLabel}`;
                return (
                  <div key={weekKey} className="border-b border-border/50 last:border-b-0">
                    <div 
                      className="flex items-center justify-between p-2 hover:bg-background cursor-pointer"
                      onClick={() => toggleWeek(weekKey)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedWeeks[weekKey] ? <ChevronDown className="w-3.5 h-3.5 text-textSecondary" /> : <ChevronRight className="w-3.5 h-3.5 text-textSecondary" />}
                        <span className="text-sm text-textSecondary">{weekLabel}</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-success">+{formatCurrencyStatic(weekData.inflow)}</span>
                        <span className="text-danger">-{formatCurrencyStatic(weekData.outflow)}</span>
                      </div>
                    </div>
                    
                    {expandedWeeks[weekKey] && (
                      <div className="pl-6 bg-background p-2 border-t border-border/50">
                        <table className="w-full text-xs text-left">
                          <thead className="text-textSecondary uppercase border-b border-border/50">
                            <tr>
                              <th className="py-2 px-4 w-28">Tanggal</th>
                              <th className="py-2 px-4">Keterangan</th>
                              <th className="py-2 px-4 text-right">Nominal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {weekData.transactions.map((detail: any, idx: number) => (
                              <tr key={idx} className="hover:bg-card">
                                <td className="py-2 px-4 whitespace-nowrap text-textSecondary">{detail.date}</td>
                                <td className="py-2 px-4 text-textPrimary">{detail.description || detail.journal_number}</td>
                                <td className={`py-2 px-4 text-right font-medium ${detail.type === 'inflow' ? 'text-success' : 'text-danger'}`}>
                                  {detail.type === 'inflow' ? '+' : '-'}{formatCurrencyStatic(detail.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'cashflow' | 'equity' | 'calk'>('income');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // Start of month
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
  const [isDetailedMode, setIsDetailedMode] = useState(true);
  
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  
  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      let endpoint = '';
      
      switch(activeTab) {
        case 'income':
          endpoint = `/api/v1/financial-statements/income-statement?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'balance':
          endpoint = `/api/v1/financial-statements/balance-sheet?as_of_date=${endDate}`;
          break;
        case 'cashflow':
          endpoint = `/api/v1/financial-statements/cash-flow?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'equity':
          endpoint = `/api/v1/financial-statements/equity-changes?start_date=${startDate}&end_date=${endDate}`;
          break;
        case 'calk':
          endpoint = `/api/v1/financial-statements/calk-notes?start_date=${startDate}&end_date=${endDate}`;
          break;
      }
      
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      setReportData(result);
    } catch (error) {
      console.error('Error fetching report:', error);
      addToast('error', 'Fetch Error', 'Gagal menarik data laporan keuangan dari server.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val || 0);
  };

  const renderTabs = () => {
    const tabs = [
      { id: 'income', label: 'Laba Rugi', icon: TrendingUp },
      { id: 'balance', label: 'Neraca', icon: Landmark },
      { id: 'cashflow', label: 'Arus Kas', icon: Wallet },
      { id: 'equity', label: 'Perubahan Modal', icon: BarChart3 },
      { id: 'calk', label: 'CALK', icon: BookOpen },
    ];

    return (
      <div className="flex overflow-x-auto border-b border-border bg-card rounded-t-xl px-4 pt-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-textSecondary hover:text-textPrimary hover:border-border'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderIncomeStatement = () => {
    if (!reportData) return null;
    
    return (
      <div className="p-6 bg-card rounded-b-xl border border-t-0 border-border shadow-sm">
        <div className="text-center mb-8 border-b border-border pb-6">
          <h2 className="text-2xl font-bold text-textPrimary">INCOME STATEMENT (LABA RUGI)</h2>
          <p className="text-textSecondary">Periode: {reportData.period}</p>
        </div>
        
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Revenue */}
          <div>
            <h3 className="font-bold text-lg text-textPrimary border-b border-border pb-2 mb-3">PENDAPATAN (REVENUE)</h3>
            {reportData.revenue?.items?.map((item: any) => (
              <div key={item.account_code} className="flex justify-between py-2 px-4 hover:bg-background/50">
                <span className="text-textSecondary">{item.account_code} - {item.account_name}</span>
                <span className="font-medium">{formatCurrency(item.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 px-4 bg-primary/5 font-bold text-primary border-t border-border mt-2">
              <span>Total Pendapatan</span>
              <span>{formatCurrency(reportData.revenue?.total)}</span>
            </div>
          </div>

          {/* COGS */}
          <div>
            <h3 className="font-bold text-lg text-textPrimary border-b border-border pb-2 mb-3">BEBAN POKOK (COGS)</h3>
            {reportData.cogs?.items?.map((item: any) => (
              <div key={item.account_code} className="flex justify-between py-2 px-4 hover:bg-background/50">
                <span className="text-textSecondary">{item.account_code} - {item.account_name}</span>
                <span className="font-medium text-danger">({formatCurrency(item.balance)})</span>
              </div>
            ))}
            <div className="flex justify-between py-3 px-4 bg-background font-bold text-textPrimary border-t border-border mt-2">
              <span>Total Beban Pokok</span>
              <span className="text-danger">({formatCurrency(reportData.cogs?.total)})</span>
            </div>
          </div>
          
          <div className="flex justify-between py-4 px-4 bg-primary/10 font-bold text-lg text-primary rounded-lg border border-primary/20">
            <span>LABA KOTOR (GROSS PROFIT)</span>
            <span>{formatCurrency(reportData.gross_profit)}</span>
          </div>

          {/* Expenses */}
          <div>
            <h3 className="font-bold text-lg text-textPrimary border-b border-border pb-2 mb-3">BEBAN OPERASIONAL (OPEX)</h3>
            {reportData.expenses?.items?.map((item: any) => (
              <div key={item.account_code} className="flex justify-between py-2 px-4 hover:bg-background/50">
                <span className="text-textSecondary">{item.account_code} - {item.account_name}</span>
                <span className="font-medium text-danger">({formatCurrency(item.balance)})</span>
              </div>
            ))}
            <div className="flex justify-between py-3 px-4 bg-background font-bold text-textPrimary border-t border-border mt-2">
              <span>Total Beban Operasional</span>
              <span className="text-danger">({formatCurrency(reportData.expenses?.total)})</span>
            </div>
          </div>

          <div className={`flex justify-between py-5 px-6 font-bold text-xl rounded-xl shadow-inner ${reportData.net_income >= 0 ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
            <span>LABA BERSIH (NET INCOME)</span>
            <span>{formatCurrency(reportData.net_income)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!reportData) return null;
    
    return (
      <div className="p-6 bg-card rounded-b-xl border border-t-0 border-border shadow-sm">
        <div className="text-center mb-8 border-b border-border pb-6">
          <h2 className="text-2xl font-bold text-textPrimary">BALANCE SHEET (NERACA)</h2>
          <p className="text-textSecondary">Per Tanggal: {reportData.as_of_date}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
          {/* ASSETS */}
          <div className="space-y-4">
            <h3 className="font-bold text-xl text-primary border-b-2 border-primary pb-2 mb-4">ASET (ASSETS)</h3>
            <div className="space-y-2">
              {reportData.assets?.items?.map((item: any) => (
                <div key={item.account_code} className="flex justify-between py-2 px-3 hover:bg-background/50 rounded">
                  <span className="text-textSecondary">{item.account_code} - {item.account_name}</span>
                  <span className="font-medium text-textPrimary">{formatCurrency(item.balance)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between py-4 px-4 bg-primary/10 font-bold text-lg text-primary rounded-lg border border-primary/20 mt-6">
              <span>TOTAL ASET</span>
              <span>{formatCurrency(reportData.assets?.total)}</span>
            </div>
          </div>

          {/* LIABILITIES & EQUITY */}
          <div className="space-y-8">
            <div>
              <h3 className="font-bold text-xl text-warning border-b-2 border-warning pb-2 mb-4">KEWAJIBAN (LIABILITIES)</h3>
              <div className="space-y-2">
                {reportData.liabilities?.items?.map((item: any) => (
                  <div key={item.account_code} className="flex justify-between py-2 px-3 hover:bg-background/50 rounded">
                    <span className="text-textSecondary">{item.account_code} - {item.account_name}</span>
                    <span className="font-medium text-textPrimary">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-3 px-4 bg-background font-bold text-textPrimary border-t border-border mt-4">
                <span>Total Kewajiban</span>
                <span>{formatCurrency(reportData.liabilities?.total)}</span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xl text-success border-b-2 border-success pb-2 mb-4">EKUITAS (EQUITY)</h3>
              <div className="space-y-2">
                {reportData.equity?.items?.map((item: any) => (
                  <div key={item.account_code} className="flex justify-between py-2 px-3 hover:bg-background/50 rounded">
                    <span className={`text-textSecondary ${item.account_code === '3999' ? 'italic' : ''}`}>{item.account_code} - {item.account_name}</span>
                    <span className="font-medium text-textPrimary">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-3 px-4 bg-background font-bold text-textPrimary border-t border-border mt-4">
                <span>Total Ekuitas</span>
                <span>{formatCurrency(reportData.equity?.total)}</span>
              </div>
            </div>

            <div className="flex justify-between py-4 px-4 bg-background font-bold text-lg text-textPrimary rounded-lg border-2 border-border mt-6 shadow-sm">
              <span>TOTAL KEWAJIBAN & EKUITAS</span>
              <span>{formatCurrency(reportData.total_liabilities_and_equity)}</span>
            </div>
          </div>
        </div>
        
        {/* Balance Status */}
        <div className="mt-10 pt-6 border-t border-border flex justify-center">
          {reportData.is_balanced ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-success/10 text-success rounded-full border border-success/20 font-bold">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              NERACA SEIMBANG (BALANCED)
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-danger/10 text-danger rounded-full border border-danger/20 font-bold">
              <div className="w-3 h-3 rounded-full bg-danger animate-pulse"></div>
              NERACA TIDAK SEIMBANG (UNBALANCED)
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCashFlow = () => {
    if (!reportData) return null;
    return (
      <div className="p-6 bg-card rounded-b-xl border border-t-0 border-border shadow-sm">
         <div className="text-center mb-8 border-b border-border pb-6 relative">
          <h2 className="text-2xl font-bold text-textPrimary">STATEMENT OF CASH FLOW (ARUS KAS)</h2>
          <p className="text-textSecondary">Periode: {reportData.period}</p>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <button 
              onClick={() => setIsDetailedMode(!isDetailedMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDetailedMode ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
            >
              <FileText className="w-4 h-4" />
              {isDetailedMode ? 'Sembunyikan Rincian' : 'Tampilkan Rincian'}
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Operating */}
          <div className="border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-background px-4 py-3 border-b border-border font-bold text-primary flex justify-between">
              <span>Arus Kas dari Aktivitas Operasi</span>
              <span>{formatCurrency(reportData.operating_activities?.net)}</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-textSecondary">
                <span>Penerimaan Kas (Inflow)</span>
                <span className="text-success">{formatCurrency(reportData.operating_activities?.inflow)}</span>
              </div>
              <div className="flex justify-between text-textSecondary">
                <span>Pengeluaran Kas (Outflow)</span>
                <span className="text-danger">({formatCurrency(reportData.operating_activities?.outflow)})</span>
              </div>
            </div>
            {isDetailedMode && reportData.operating_activities?.details?.length > 0 && (
              <HierarchicalCashFlowTable details={reportData.operating_activities.details} />
            )}
          </div>

          {/* Investing */}
          <div className="border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-background px-4 py-3 border-b border-border font-bold text-primary flex justify-between">
              <span>Arus Kas dari Aktivitas Investasi</span>
              <span>{formatCurrency(reportData.investing_activities?.net)}</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-textSecondary">
                <span>Penerimaan Kas (Inflow)</span>
                <span className="text-success">{formatCurrency(reportData.investing_activities?.inflow)}</span>
              </div>
              <div className="flex justify-between text-textSecondary">
                <span>Pengeluaran Kas (Outflow)</span>
                <span className="text-danger">({formatCurrency(reportData.investing_activities?.outflow)})</span>
              </div>
            </div>
            {isDetailedMode && reportData.investing_activities?.details?.length > 0 && (
              <HierarchicalCashFlowTable details={reportData.investing_activities.details} />
            )}
          </div>

          {/* Financing */}
          <div className="border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-background px-4 py-3 border-b border-border font-bold text-primary flex justify-between">
              <span>Arus Kas dari Aktivitas Pendanaan</span>
              <span>{formatCurrency(reportData.financing_activities?.net)}</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-textSecondary">
                <span>Penerimaan Kas (Inflow)</span>
                <span className="text-success">{formatCurrency(reportData.financing_activities?.inflow)}</span>
              </div>
              <div className="flex justify-between text-textSecondary">
                <span>Pengeluaran Kas (Outflow)</span>
                <span className="text-danger">({formatCurrency(reportData.financing_activities?.outflow)})</span>
              </div>
            </div>
            {isDetailedMode && reportData.financing_activities?.details?.length > 0 && (
              <HierarchicalCashFlowTable details={reportData.financing_activities.details} />
            )}
          </div>

          <div className={`flex justify-between py-5 px-6 font-bold text-xl rounded-xl shadow-inner ${reportData.net_increase_in_cash >= 0 ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'}`}>
            <span>KENAIKAN / (PENURUNAN) KAS BERSIH</span>
            <span>{formatCurrency(reportData.net_increase_in_cash)}</span>
          </div>

        </div>
      </div>
    );
  };

  const renderEquity = () => {
    if (!reportData) return null;
    return (
      <div className="p-6 bg-card rounded-b-xl border border-t-0 border-border shadow-sm">
         <div className="text-center mb-8 border-b border-border pb-6">
          <h2 className="text-2xl font-bold text-textPrimary">STATEMENT OF CHANGES IN EQUITY</h2>
          <p className="text-textSecondary">Periode: {reportData.period}</p>
        </div>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between py-4 px-4 bg-background font-bold text-lg text-textPrimary border border-border rounded-lg shadow-sm">
            <span>Modal Awal (Beginning Equity)</span>
            <span>{formatCurrency(reportData.beginning_equity)}</span>
          </div>
          
          <div className="pl-6 border-l-2 border-border space-y-4">
            <div className="flex justify-between text-textPrimary">
              <span>Laba Bersih Tahun Berjalan</span>
              <span className={`font-medium ${reportData.additions?.net_income >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(reportData.additions?.net_income)}
              </span>
            </div>
            <div className="flex justify-between text-textPrimary">
              <span>Tambahan Modal Disetor</span>
              <span className="text-success font-medium">{formatCurrency(reportData.additions?.new_capital)}</span>
            </div>
            <div className="flex justify-between text-textPrimary">
              <span>Penarikan Dividen / Prive</span>
              <span className="text-danger font-medium">{formatCurrency(reportData.deductions?.dividends_paid)}</span>
            </div>
          </div>

          <div className="flex justify-between py-5 px-6 bg-primary/10 font-bold text-xl text-primary border border-primary/20 rounded-xl shadow-sm">
            <span>MODAL AKHIR (ENDING EQUITY)</span>
            <span>{formatCurrency(reportData.ending_equity)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCalk = () => {
    if (!reportData || !reportData.summary) return (
      <div className="p-10 bg-card rounded-b-xl border border-t-0 border-border shadow-sm text-center text-textSecondary">
        Data CALK belum tersedia (pastikan backend merespon dengan data lengkap).
      </div>
    );

    const summary = reportData.summary;

    return (
      <div className="p-10 bg-card rounded-b-xl border border-t-0 border-border shadow-sm">
         <div className="text-center mb-10 border-b-2 border-border pb-6">
          <h2 className="text-3xl font-bold text-textPrimary mb-2">CATATAN ATAS LAPORAN KEUANGAN (CALK)</h2>
          <p className="text-lg text-textSecondary">Periode: {reportData.period}</p>
        </div>
        <div className="max-w-4xl mx-auto space-y-10 font-sans leading-relaxed text-textPrimary">
          
          {/* 1. Posisi Kas & Bank */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-4">
              <Wallet className="text-primary w-6 h-6" />
              <h3 className="font-bold text-xl text-primary">1. Posisi Kas & Bank (Cash Position)</h3>
            </div>
            <p className="text-textSecondary">
              Saldo kas dan bank perusahaan yang tersedia untuk kegiatan operasional per akhir periode berjumlah <span className="font-bold text-textPrimary">{formatCurrency(summary.cash_position)}</span>. Rincian saldo kas adalah sebagai berikut:
            </p>
            <div className="bg-background border border-border rounded-lg p-4 grid gap-2">
              {Object.entries(summary.cash_by_account || {}).map(([name, amount]: any) => (
                <div key={name} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span>{name}</span>
                  <span className="font-semibold">{formatCurrency(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 font-bold text-primary mt-2">
                <span>Total Kas & Bank</span>
                <span>{formatCurrency(summary.cash_position)}</span>
              </div>
            </div>
          </div>

          {/* 2. Kinerja Proyek */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-4">
              <BookOpen className="text-success w-6 h-6" />
              <h3 className="font-bold text-xl text-success">2. Nilai Proyek Aktif</h3>
            </div>
            <p className="text-textSecondary">
              Perusahaan saat ini memiliki <span className="font-bold text-textPrimary">{summary.active_projects}</span> proyek aktif dari total {summary.total_projects} proyek tercatat. Total Nilai Kontrak (Contract Value) dari seluruh proyek tersebut adalah <span className="font-bold text-textPrimary">{formatCurrency(summary.total_contract_value)}</span>.
            </p>
            <div className="bg-background border border-border rounded-lg p-4 grid gap-2">
              {summary.project_list?.map((p: any) => (
                <div key={p.code} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-textSecondary">{p.code} • Status: <span className="uppercase">{p.status}</span></span>
                  </div>
                  <span className="font-semibold">{formatCurrency(p.value)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 font-bold text-success mt-2">
                <span>Total Contract Value</span>
                <span>{formatCurrency(summary.total_contract_value)}</span>
              </div>
            </div>
          </div>

          {/* 3. Piutang (AR) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-4">
              <TrendingUp className="text-info w-6 h-6" />
              <h3 className="font-bold text-xl text-info">3. Piutang Usaha (Account Receivables)</h3>
            </div>
            <p className="text-textSecondary">
              Total tagihan kepada klien/pelanggan yang telah diterbitkan (Invoiced) adalah sebesar <span className="font-bold text-textPrimary">{formatCurrency(summary.total_ar)}</span>. Dari jumlah tersebut, tagihan yang masih menunggak atau belum dibayar penuh (Outstanding) sebesar <span className="font-bold text-danger">{formatCurrency(summary.outstanding_ar)}</span>.
            </p>
            <div className="bg-background border border-border rounded-lg p-4 grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded p-3 text-center">
                <p className="text-sm text-textSecondary">Total AR</p>
                <p className="text-xl font-bold text-textPrimary">{formatCurrency(summary.total_ar)}</p>
              </div>
              <div className="bg-danger/10 border border-danger/20 rounded p-3 text-center">
                <p className="text-sm text-danger">Outstanding AR</p>
                <p className="text-xl font-bold text-danger">{formatCurrency(summary.outstanding_ar)}</p>
              </div>
            </div>
          </div>

          {/* 4. Hutang (AP) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-4">
              <Landmark className="text-warning w-6 h-6" />
              <h3 className="font-bold text-xl text-warning">4. Hutang Usaha (Account Payables)</h3>
            </div>
            <p className="text-textSecondary">
              Total hutang kepada vendor/subkontraktor yang tercatat adalah sebesar <span className="font-bold text-textPrimary">{formatCurrency(summary.total_ap)}</span>. Sisa kewajiban yang masih harus dibayar (Outstanding) saat ini adalah <span className="font-bold text-danger">{formatCurrency(summary.outstanding_ap)}</span>.
            </p>
             <div className="bg-background border border-border rounded-lg p-4 grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded p-3 text-center">
                <p className="text-sm text-textSecondary">Total AP</p>
                <p className="text-xl font-bold text-textPrimary">{formatCurrency(summary.total_ap)}</p>
              </div>
              <div className="bg-danger/10 border border-danger/20 rounded p-3 text-center">
                <p className="text-sm text-danger">Outstanding AP</p>
                <p className="text-xl font-bold text-danger">{formatCurrency(summary.outstanding_ap)}</p>
              </div>
            </div>
          </div>

          {/* 5. Pendapatan & Pengeluaran */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-4">
              <BarChart3 className="text-purple-500 w-6 h-6" />
              <h3 className="font-bold text-xl text-purple-500">5. Kinerja Keuangan (Laba & Pengeluaran)</h3>
            </div>
            <p className="text-textSecondary">
              Selama periode ini, total pendapatan yang dicatat adalah <span className="font-bold text-textPrimary">{formatCurrency(summary.total_revenue)}</span>.
              Total pengeluaran (Beban Pokok + Beban Operasional) berjumlah <span className="font-bold text-danger">{formatCurrency(summary.total_expenses)}</span>.
              Berdasarkan selisih tersebut, perusahaan mencetak Laba Bersih (Net Profit) sebesar <span className={`font-bold ${summary.net_profit >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(summary.net_profit)}</span>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Rincian COGS */}
              <div className="bg-background border border-border rounded-lg p-4 flex flex-col h-full">
                <h4 className="font-semibold text-textPrimary mb-3 pb-2 border-b border-border">Rincian Beban Pokok (COGS)</h4>
                <div className="space-y-2 text-sm flex-1">
                  {Object.entries(summary.cogs_breakdown || {}).length > 0 ? (
                    Object.entries(summary.cogs_breakdown || {}).map(([name, amount]: any) => (
                      <div key={name} className="flex justify-between">
                        <span className="text-textSecondary">{name}</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                    ))
                  ) : (
                     <div className="text-textSecondary italic">Belum ada beban pokok.</div>
                  )}
                </div>
                <div className="flex justify-between pt-3 mt-3 border-t border-border font-bold text-textPrimary">
                  <span>Total COGS</span>
                  <span>{formatCurrency(summary.total_cogs)}</span>
                </div>
              </div>

              {/* Rincian OPEX */}
              <div className="bg-background border border-border rounded-lg p-4 flex flex-col h-full">
                <h4 className="font-semibold text-textPrimary mb-3 pb-2 border-b border-border">Rincian Operasional (OPEX)</h4>
                <div className="space-y-2 text-sm flex-1">
                  {Object.entries(summary.opex_breakdown || {}).length > 0 ? (
                    Object.entries(summary.opex_breakdown || {}).map(([name, amount]: any) => (
                      <div key={name} className="flex justify-between">
                        <span className="text-textSecondary w-48 overflow-hidden text-ellipsis whitespace-nowrap inline-block" title={name}>{name}</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-textSecondary italic">Belum ada beban operasional.</div>
                  )}
                </div>
                <div className="flex justify-between pt-3 mt-3 border-t border-border font-bold text-textPrimary">
                  <span>Total OPEX</span>
                  <span>{formatCurrency(summary.total_opex)}</span>
                </div>
              </div>
            </div>
            
            <div className={`mt-6 flex justify-between p-4 rounded-xl border font-bold text-xl shadow-sm ${summary.net_profit >= 0 ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'}`}>
              <span>NET PROFIT (RUGI/LABA)</span>
              <span>{formatCurrency(summary.net_profit)}</span>
            </div>
          </div>

          <div className="mt-16 pt-16 grid grid-cols-2 text-center text-sm">
            <div>
              <p className="mb-24">Mengetahui,</p>
              <p className="font-bold underline">Direktur Utama</p>
            </div>
            <div>
              <p className="mb-24">Disusun Oleh,</p>
              <p className="font-bold underline">Manajer Keuangan / Akuntansi</p>
            </div>
          </div>

          {/* 5. Kebijakan Akuntansi & Catatan Penting */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-4">
              <BookOpen className="text-primary w-6 h-6" />
              <h3 className="font-bold text-xl text-primary">5. Kebijakan Akuntansi & Catatan Penting</h3>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 space-y-4 text-textSecondary text-sm leading-relaxed">
              <p>
                <strong className="text-primary block mb-1">A. Sistem Laporan Keuangan Umum vs Laporan Per Proyek</strong>
                Laporan Keuangan Umum (General Financial Statements) mencakup seluruh aktivitas finansial perusahaan, termasuk Pendapatan, Beban Pokok (COGS), dan Beban Operasional (OPEX). Sementara itu, <strong>Laporan Keuangan Per Proyek</strong> hanya berfokus pada Laba Kotor (Gross Profit) dari masing-masing proyek secara individual (Nilai Pendapatan Proyek dikurangi Beban Langsung/Subkontraktor).
              </p>
              <p>
                Oleh karena itu, total Laba Kotor dari seluruh proyek <strong>tidak akan sama</strong> dengan Laba Bersih (Net Profit) maupun Sisa Kas Aktual perusahaan. Hal ini disebabkan karena sebagian dari kas dan laba kotor proyek tersebut telah digunakan untuk membiayai pengeluaran operasional (OPEX) seperti gaji staf non-proyek, utilitas, pajak, dan pengeluaran administrasi lainnya.
              </p>
              <p>
                <strong className="text-primary block mb-1">B. Mutasi Kas dan Bank (Inter-bank Transfers)</strong>
                Perpindahan dana antar rekening bank milik perusahaan (misalnya dari Bank Mandiri ke Bank CIMB) dicatat murni sebagai pemindahan letak kas melalui Jurnal Umum (Journal Entries) dan <strong>tidak diakui sebagai beban maupun pendapatan</strong>. Mutasi ini tidak mempengaruhi Laba/Rugi perusahaan, melainkan hanya merubah rincian pada Posisi Kas & Bank di Neraca.
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/finance" 
            className="p-2 bg-card border border-border rounded-lg text-textSecondary hover:text-primary hover:border-primary/50 transition-colors"
            title="Back to Finance"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">Standard Financial Reports</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
              <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
              <span>/</span>
              <span className="text-textPrimary">Financial Reports</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border shadow-sm">
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <span className="text-textSecondary text-sm">to</span>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button onClick={fetchReportData} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-card rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm ml-2">
            <Filter className="w-4 h-4" />
            Apply
          </button>
          <div className="w-px h-6 bg-border mx-1"></div>
          <button 
            onClick={() => generateSingleReportPDF(activeTab, reportData, startDate, endDate)}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-slate-900 rounded-lg font-medium hover:bg-secondary/90 transition-colors text-sm border border-secondary"
          >
            <Download className="w-4 h-4" />
            {activeTab === 'income' ? 'Unduh Laba Rugi' : 
             activeTab === 'balance' ? 'Unduh Neraca' : 
             activeTab === 'cashflow' ? 'Unduh Arus Kas' : 
             activeTab === 'equity' ? 'Unduh Ekuitas' : 'Unduh CALK'}
          </button>
          <button 
            onClick={() => generateConsolidatedReportPDF(startDate, endDate, addToast)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            Unduh Semua Laporan
          </button>
        </div>
      </div>

      <div className="mt-6">
        {renderTabs()}
        
        {isLoading ? (
          <div className="p-20 bg-card rounded-b-xl border border-t-0 border-border shadow-sm flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-textSecondary">Menyusun laporan keuangan akuntansi...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {activeTab === 'income' && renderIncomeStatement()}
            {activeTab === 'balance' && renderBalanceSheet()}
            {activeTab === 'cashflow' && renderCashFlow()}
            {activeTab === 'equity' && renderEquity()}
            {activeTab === 'calk' && renderCalk()}
          </div>
        )}
      </div>
    </div>
  );
}
