import { useState, useEffect } from 'react';
import { Search, Calendar, Filter, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ApAgingData {
  id: string;
  invoice_number: string;
  vendor_name: string;
  due_date: string;
  amount: number;
  balance: number;
  days_late: number;
  bucket: string;
}

export function ApAgingReport() {
  const [data, setData] = useState<ApAgingData[]>([]);
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
      const response = await fetch(`http://localhost:8000/api/v1/finance/reports/ap-aging?as_of_date=${asOfDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result.data || []);
      setSummary(result.summary || {
        current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_over_90: 0, total: 0
      });
    } catch (error) {
      console.error('Error fetching AP Aging report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    item.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
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
      case 'current': return 'Lancar (Belum Jatuh Tempo)';
      case 'days_1_30': return '1 - 30 Hari';
      case 'days_31_60': return '31 - 60 Hari';
      case 'days_61_90': return '61 - 90 Hari';
      case 'days_over_90': return '> 90 Hari (Macet)';
      default: return bucket;
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
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
            <h1 className="text-2xl font-bold text-textPrimary">AP Aging Report (Umur Hutang)</h1>
            <p className="text-textSecondary text-sm mt-1">Analisis jatuh tempo kewajiban hutang usaha kepada vendor & supplier.</p>
          </div>
        </div>
      </div>

      {/* Aging Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <span className="text-xs font-semibold text-textSecondary uppercase">Lancar (Current)</span>
          <p className="text-lg font-bold text-success mt-1">{formatCurrency(summary.current)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <span className="text-xs font-semibold text-textSecondary uppercase">1 - 30 Hari</span>
          <p className="text-lg font-bold text-textPrimary mt-1">{formatCurrency(summary.days_1_30)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <span className="text-xs font-semibold text-textSecondary uppercase">31 - 60 Hari</span>
          <p className="text-lg font-bold text-warning mt-1">{formatCurrency(summary.days_31_60)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <span className="text-xs font-semibold text-textSecondary uppercase">61 - 90 Hari</span>
          <p className="text-lg font-bold text-warning mt-1">{formatCurrency(summary.days_61_90)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <span className="text-xs font-semibold text-textSecondary uppercase">&gt; 90 Hari</span>
          <p className="text-lg font-bold text-danger mt-1">{formatCurrency(summary.days_over_90)}</p>
        </div>
        <div className="bg-card p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
          <span className="text-xs font-semibold text-primary uppercase">Total Hutang</span>
          <p className="text-lg font-bold text-primary mt-1">{formatCurrency(summary.total)}</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input 
              type="text" 
              placeholder="Cari nomor tagihan atau nama vendor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 text-textSecondary text-sm border-b border-border">
                <th className="p-4 font-medium">No. Tagihan (Invoice)</th>
                <th className="p-4 font-medium">Nama Vendor</th>
                <th className="p-4 font-medium">Jatuh Tempo</th>
                <th className="p-4 font-medium text-center">Keterlambatan</th>
                <th className="p-4 font-medium">Kategori Umur</th>
                <th className="p-4 font-medium text-right">Nilai Tagihan</th>
                <th className="p-4 font-medium text-right">Sisa Hutang</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-textSecondary">Memuat data umur hutang...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-textSecondary">
                    Tidak ada hutang vendor yang belum lunas per tanggal ini.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="p-4 font-medium text-primary">{item.invoice_number}</td>
                    <td className="p-4 font-medium text-textPrimary">{item.vendor_name}</td>
                    <td className="p-4 text-textSecondary">{item.due_date}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.days_late > 0 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                        {item.days_late > 0 ? `${item.days_late} Hari` : 'Belum Jatuh Tempo'}
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
