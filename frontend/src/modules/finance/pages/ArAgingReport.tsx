import { useState, useEffect } from 'react';
import { Download, Search, Calendar, Filter, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ArAgingData {
  id: string;
  invoice_number: string;
  customer_name: string;
  due_date: string;
  amount: number;
  balance: number;
  days_late: number;
  bucket: string;
}

export function ArAgingReport() {
  const [data, setData] = useState<ArAgingData[]>([]);
  const [summary, setSummary] = useState({
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_over_90: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [asOfDate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://127.0.0.1:8000/api/v1');
      const response = await fetch(`${API_BASE}/finance/reports/ar-aging?as_of_date=${asOfDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result.data || []);
      setSummary(result.summary || {
        current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0, total: 0
      });
    } catch (error) {
      console.error('Error fetching AR Aging report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    item.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const getBucketColor = (bucket: string) => {
    switch(bucket) {
      case 'current': return 'text-success';
      case 'days_1_30': return 'text-warning';
      case 'days_31_60': return 'text-warning font-semibold';
      case 'days_61_90': return 'text-danger font-semibold';
      case 'days_over_90': return 'text-danger font-bold';
      default: return 'text-textPrimary';
    }
  };

  const getBucketLabel = (bucket: string) => {
    switch(bucket) {
      case 'current': return 'Current (Not Due)';
      case 'days_1_30': return '1-30 Days';
      case 'days_31_60': return '31-60 Days';
      case 'days_61_90': return '61-90 Days';
      case 'days_over_90': return '> 90 Days';
      default: return bucket;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link 
            to="/finance" 
            className="p-2 bg-card border border-border rounded-lg text-textSecondary hover:text-primary hover:border-primary/50 transition-colors"
            title="Back to Finance"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">AR Aging Report</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
              <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
              <span>/</span>
              <span className="text-textPrimary">AR Aging Report</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-primary rounded-lg font-medium hover:bg-secondary/80 transition-colors">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <h3 className="text-xs font-medium text-textSecondary mb-1">Current (Not Due)</h3>
          <p className="text-lg font-bold text-success">{formatCurrency(summary.current)}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <h3 className="text-xs font-medium text-textSecondary mb-1">1 - 30 Days Late</h3>
          <p className="text-lg font-bold text-warning">{formatCurrency(summary.days_1_30)}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <h3 className="text-xs font-medium text-textSecondary mb-1">31 - 60 Days Late</h3>
          <p className="text-lg font-bold text-warning">{formatCurrency(summary.days_31_60)}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <h3 className="text-xs font-medium text-textSecondary mb-1">61 - 90 Days Late</h3>
          <p className="text-lg font-bold text-danger">{formatCurrency(summary.days_61_90)}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <h3 className="text-xs font-medium text-textSecondary mb-1">&gt; 90 Days Late</h3>
          <p className="text-lg font-bold text-danger">{formatCurrency(summary.days_over_90)}</p>
        </div>
        <div className="bg-card border-2 border-primary/20 bg-primary/5 p-4 rounded-xl shadow-sm">
          <h3 className="text-xs font-medium text-primary mb-1">Total Outstanding AR</h3>
          <p className="text-lg font-bold text-primary">{formatCurrency(summary.total)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center gap-4">
          <div className="relative max-w-md w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input 
              type="text" 
              placeholder="Search by invoice or customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Calendar className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border text-textPrimary rounded-lg hover:bg-secondary/10 transition-colors">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 text-textSecondary text-sm border-b border-border">
                <th className="p-4 font-medium">Invoice No.</th>
                <th className="p-4 font-medium">Customer Name</th>
                <th className="p-4 font-medium">Due Date</th>
                <th className="p-4 font-medium text-center">Days Late</th>
                <th className="p-4 font-medium">Aging Bucket</th>
                <th className="p-4 font-medium text-right">Total Invoice</th>
                <th className="p-4 font-medium text-right">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-textSecondary">Loading data...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-textSecondary">No outstanding AR invoices found.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="p-4 font-medium text-primary">{item.invoice_number}</td>
                    <td className="p-4 font-medium text-textPrimary">{item.customer_name}</td>
                    <td className="p-4 text-textSecondary">{item.due_date}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.days_late > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                        {item.days_late > 0 ? `${item.days_late} Days` : 'Not Due'}
                      </span>
                    </td>
                    <td className={`p-4 ${getBucketColor(item.bucket)}`}>{getBucketLabel(item.bucket)}</td>
                    <td className="p-4 text-right text-textSecondary">{formatCurrency(item.amount)}</td>
                    <td className="p-4 text-right font-bold text-textPrimary">{formatCurrency(item.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
