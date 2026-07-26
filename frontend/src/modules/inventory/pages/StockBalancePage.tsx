import { useState, useEffect } from 'react';
import { Package, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryApi } from '../../../services/api';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

export function StockBalancePage() {
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await inventoryApi.getInventoryItems();
      setItems(res.data);
    } catch (error) {
      console.error('Failed to fetch stock balances', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.material?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-4">
          <Link 
            to="/inventory"
            className="p-2 bg-card border border-border rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">Stock Balances</h1>
            <p className="text-textSecondary mt-1">Current inventory levels across all warehouses</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
            <input
              type="text"
              placeholder="Search by material code, name, or warehouse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-textSecondary uppercase bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium">Material Code</th>
                <th className="px-6 py-4 font-medium">Material Name</th>
                <th className="px-6 py-4 font-medium">Warehouse</th>
                <th className="px-6 py-4 font-medium text-right">Quantity</th>
                <th className="px-6 py-4 font-medium">UOM</th>
                <th className="px-6 py-4 font-medium text-right">Moving Average Cost</th>
                <th className="px-6 py-4 font-medium text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-textSecondary">Loading stock balances...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-textSecondary">
                    <div className="flex flex-col items-center">
                      <Package className="w-12 h-12 text-border mb-3" />
                      <p>No stock balances found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 font-mono text-primary">{item.material?.code}</td>
                    <td className="px-6 py-4 font-medium text-textPrimary">{item.material?.name}</td>
                    <td className="px-6 py-4 text-textSecondary">{item.warehouse?.name}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      <span className={item.quantity <= (item.material?.min_stock || 0) ? 'text-error' : 'text-success'}>
                        {item.quantity.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-textSecondary">{item.material?.uom}</td>
                    <td className="px-6 py-4 text-right">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.quantity * item.unit_cost)}</td>
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
