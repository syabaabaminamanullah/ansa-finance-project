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
  CreditCard
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
  LineChart,
  Line
} from 'recharts';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { financeApi, projectsApi, dashboardApi, api } from '../../../services/api';

const kpiTemplates = [
  { key: 'cash_position', title: 'Cash Position', icon: Wallet, isUp: true, change: '+12.5%' },
  { key: 'revenue_ytd', title: 'Revenue (YTD)', icon: TrendingUp, isUp: true, change: '+8.2%' },
  { key: 'gross_profit', title: 'Gross Profit', icon: DollarSign, isUp: true, change: '+5.4%' },
  { key: 'net_profit', title: 'Net Profit', icon: Percent, isUp: false, change: '-2.1%' },
  { key: 'total_pengeluaran', title: 'Total Pengeluaran (YTD)', icon: Drill, isUp: false, change: '' },
  { key: 'eqp_utilization', title: 'Eqp. Utilization', icon: Wrench, isUp: true, change: '+3.4%' },
  { key: 'outstanding_ar', title: 'Outstanding AR', icon: Activity, isUp: false, change: '+15.2%' },
  { key: 'outstanding_ap', title: 'Outstanding AP', icon: CreditCard, isUp: true, change: '-4.5%' },
];

export function DashboardPage() {
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [projectSummaries, setProjectSummaries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, expRes, apRes, arRes, summaryRes] = await Promise.all([
          projectsApi.getProjects(),
          financeApi.getExpenses(),
          financeApi.getApInvoices(),
          financeApi.getArInvoices(),
          api.get('/dashboard/summary')
        ]);

        const projects = projRes.data;
        const expenses = expRes.data;
        const apInvoices = apRes.data;
        const arInvoices = arRes.data;
        setSummary(summaryRes.data);

        // 1. Budget vs Actual (Billion Rp)
        const computedBudgets = projects.map((p: any) => {
          const projExpenses = expenses.filter((e: any) => e.project_id === p.id).reduce((sum: number, e: any) => sum + e.amount, 0);
          const projAp = apInvoices.filter((a: any) => a.project_id === p.id).reduce((sum: number, a: any) => sum + a.total_amount, 0);
          const actual = (projExpenses + projAp) / 1000000000;
          const budget = (p.contract_value_idr || 0) / 1000000000;
          
          return {
            project: p.code,
            budget: Number(budget.toFixed(2)),
            actual: Number(actual.toFixed(2)),
          };
        }).filter((p: any) => p.budget > 0 || p.actual > 0);

        // Sort by budget descending and take top 5
        computedBudgets.sort((a: any, b: any) => b.budget - a.budget);
        setBudgetData(computedBudgets.slice(0, 5));

        // 2. Cash Flow (dari endpoint baru - data journal akuntansi)
        const cfRes = await api.get('/dashboard/cashflow-monthly');
        setCashFlowData(cfRes.data);

        // 3. Project Summaries (New)
        const projSums = projects.map((p: any) => {
          const inc = arInvoices.filter((ar: any) => ar.project_id === p.id).reduce((sum: number, ar: any) => sum + ar.total_amount, 0);
          const exp = expenses.filter((e: any) => e.project_id === p.id).reduce((sum: number, e: any) => sum + e.amount, 0);
          const ap = apInvoices.filter((a: any) => a.project_id === p.id).reduce((sum: number, a: any) => sum + a.total_amount, 0);
          
          return {
            name: p.name,
            code: p.code,
            budget: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(p.contract_value_idr || 0),
            income: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inc),
            expense: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(exp + ap)
          };
        });
        setProjectSummaries(projSums);

        // 4. Recent Transactions
        const allTransactions = [
          ...arInvoices.map((ar: any) => ({
            id: ar.invoice_number,
            date: ar.date,
            desc: `Invoice to Customer`,
            module: 'Account Receivable',
            amount: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(ar.total_amount),
            status: ar.status,
            rawDate: new Date(ar.date).getTime()
          })),
          ...apInvoices.map((ap: any) => ({
            id: ap.invoice_number,
            date: ap.date,
            desc: `Vendor Bill - ${ap.vendor_id || 'Vendor'}`,
            module: 'Account Payable',
            amount: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(ap.total_amount),
            status: ap.status,
            rawDate: new Date(ap.date).getTime()
          })),
          ...expenses.map((e: any) => ({
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
        setRecentTransactions(allTransactions.slice(0, 5));

      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Executive Dashboard</h1>
          <p className="text-textSecondary text-sm mt-1">Welcome back, here is what's happening today.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-background transition-colors text-textPrimary">
            Export Report
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
            New Transaction
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiTemplates.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-textSecondary">{kpi.title}</h3>
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-bold text-textPrimary">
                  {summary[kpi.key] || 'Rp 0'}
                </h2>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {kpi.change ? (
                  <>
                    <span className={clsx("flex items-center font-medium", kpi.isUp ? "text-success" : "text-danger")}>
                      {kpi.isUp ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                      {kpi.change}
                    </span>
                    <span className="text-textSecondary ml-2">vs last month</span>
                  </>
                ) : (
                  <span className="text-textSecondary text-xs">Total tahun ini</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-lg font-bold text-textPrimary mb-6">Cash Flow Bulanan (Rp)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E2D2" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 11}}
                  tickFormatter={(val: number) => {
                    if (val >= 1_000_000_000) return `${(val/1_000_000_000).toFixed(1)}M`;
                    if (val >= 1_000_000) return `${(val/1_000_000).toFixed(0)}Jt`;
                    if (val >= 1_000) return `${(val/1_000).toFixed(0)}Rb`;
                    return `${val}`;
                  }}
                  width={70}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#7F8F74', borderRadius: '8px' }}
                  formatter={(value: number) => [
                    `Rp ${Number(value).toLocaleString('id-ID')}`,
                  ]}
                />
                <Legend />
                <Line type="monotone" name="Cash In" dataKey="in" stroke="#16A34A" strokeWidth={3} dot={{r: 4, fill: '#16A34A'}} activeDot={{r: 6}} />
                <Line type="monotone" name="Cash Out" dataKey="out" stroke="#DC2626" strokeWidth={3} dot={{r: 4, fill: '#DC2626'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs Actual */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-lg font-bold text-textPrimary mb-6">Budget vs Actual (Billion Rp)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E2D2" />
                <XAxis dataKey="project" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#7F8F74', borderRadius: '8px' }}
                  cursor={{fill: '#E5E2D2', opacity: 0.4}}
                />
                <Legend />
                <Bar dataKey="budget" name="Budget" fill="#CAD5B5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Project Summaries */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold text-textPrimary">Project Financial Summary (Per Proyek)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-textSecondary font-medium">
              <tr>
                <th className="px-6 py-4">Project Code</th>
                <th className="px-6 py-4">Project Name</th>
                <th className="px-6 py-4">Contract Value (Nilai Proyek)</th>
                <th className="px-6 py-4 text-success">Total Invoiced (Uang Masuk)</th>
                <th className="px-6 py-4 text-danger">Total Cost (Pengeluaran)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projectSummaries.length > 0 ? (
                projectSummaries.map((row, i) => (
                  <tr key={i} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary">{row.code}</td>
                    <td className="px-6 py-4 text-textPrimary">{row.name}</td>
                    <td className="px-6 py-4 text-textSecondary font-medium">{row.budget}</td>
                    <td className="px-6 py-4 text-success font-medium">{row.income}</td>
                    <td className="px-6 py-4 text-danger font-medium">{row.expense}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-textSecondary">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Summary */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold text-textPrimary">Recent Transactions</h3>
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
            <tbody className="divide-y divide-border">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((row, i) => (
                  <tr key={i} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary">{row.id}</td>
                    <td className="px-6 py-4 text-textSecondary">{row.date}</td>
                    <td className="px-6 py-4 text-textPrimary">{row.desc}</td>
                    <td className="px-6 py-4 text-textSecondary">{row.module}</td>
                    <td className="px-6 py-4 text-textPrimary font-medium">{row.amount}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium",
                        (row.status === 'Paid' || row.status === 'Posted' || row.status === 'Approved' || row.status === 'Settled') 
                          ? "bg-success/10 text-success" 
                          : "bg-warning/10 text-warning"
                      )}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-textSecondary">
                    No recent transactions found.
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
