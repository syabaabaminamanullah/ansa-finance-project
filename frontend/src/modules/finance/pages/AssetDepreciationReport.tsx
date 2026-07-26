import { useState, useEffect } from 'react';
import { Download, FileText, Search, Calendar, Filter, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Assuming financialsApi has getAssetDepreciation
import { financialsApi } from '../../../services/api';

interface DepreciationData {
  id: string;
  asset_number: string;
  name: string;
  asset_type: string;
  purchase_date: string;
  purchase_price: number;
  useful_life_years: number;
  monthly_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
}

export function AssetDepreciationReport() {
  const [data, setData] = useState<DepreciationData[]>([]);
  const [summary, setSummary] = useState({
    total_purchase_price: 0,
    total_accumulated_depreciation: 0,
    total_book_value: 0
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
      // Fallback in case endpoint is not fully registered in frontend api yet
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/v1/finance/reports/asset-depreciation?as_of_date=${asOfDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result.data || []);
      setSummary(result.summary || {
        total_purchase_price: 0,
        total_accumulated_depreciation: 0,
        total_book_value: 0
      });
    } catch (error) {
      console.error('Error fetching depreciation report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.asset_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
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
            <h1 className="text-2xl font-bold text-textPrimary">Fixed Asset Depreciation</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-textSecondary">
              <Link to="/finance" className="hover:text-primary transition-colors">Finance</Link>
              <span>/</span>
              <span className="text-textPrimary">Fixed Asset Depreciation</span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-textSecondary mb-2">Total Asset Value (Cost)</h3>
          <p className="text-3xl font-bold text-textPrimary">{formatCurrency(summary.total_purchase_price)}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-textSecondary mb-2">Total Accumulated Depreciation</h3>
          <p className="text-3xl font-bold text-danger">{formatCurrency(summary.total_accumulated_depreciation)}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-medium text-textSecondary mb-2">Current Net Book Value</h3>
          <p className="text-3xl font-bold text-success">{formatCurrency(summary.total_book_value)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center gap-4">
          <div className="relative max-w-md w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
            <input 
              type="text" 
              placeholder="Search assets..." 
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
                <th className="p-4 font-medium">Asset No.</th>
                <th className="p-4 font-medium">Asset Name</th>
                <th className="p-4 font-medium">Purchase Date</th>
                <th className="p-4 font-medium text-right">Cost Price</th>
                <th className="p-4 font-medium text-center">Life (Yrs)</th>
                <th className="p-4 font-medium text-right">Depreciation /Mo</th>
                <th className="p-4 font-medium text-right">Accumulated Depr.</th>
                <th className="p-4 font-medium text-right">Book Value</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-textSecondary">Loading data...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-textSecondary">No fixed assets found.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="p-4 font-medium text-textPrimary">{item.asset_number}</td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium text-textPrimary">{item.name}</div>
                        <div className="text-xs text-textSecondary">{item.asset_type || 'Asset'}</div>
                      </div>
                    </td>
                    <td className="p-4 text-textSecondary">{item.purchase_date?.split('T')[0] || '-'}</td>
                    <td className="p-4 text-right font-medium text-textPrimary">{formatCurrency(item.purchase_price)}</td>
                    <td className="p-4 text-center text-textSecondary">{item.useful_life_years}</td>
                    <td className="p-4 text-right text-danger">{formatCurrency(item.monthly_depreciation)}</td>
                    <td className="p-4 text-right text-danger">{formatCurrency(item.accumulated_depreciation)}</td>
                    <td className="p-4 text-right font-bold text-success">{formatCurrency(item.book_value)}</td>
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
