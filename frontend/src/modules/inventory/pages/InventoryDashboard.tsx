import { useState, useEffect } from 'react';
import { Package, ArrowUpRight, ArrowDownRight, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { inventoryApi } from '../../../services/api';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

export function InventoryDashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStock: 0,
    totalWarehouses: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, materialsRes, warehousesRes] = await Promise.all([
        inventoryApi.getInventoryItems(),
        inventoryApi.getMaterials(),
        inventoryApi.getWarehouses()
      ]);

      const items = itemsRes.data;
      const materials = materialsRes.data;

      // Calculate total value
      const totalValue = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_cost), 0);
      
      // Calculate low stock items (group by material)
      let lowStockCount = 0;
      materials.forEach((m: any) => {
        const materialStock = items.filter((i: any) => i.material_id === m.id)
                                 .reduce((sum: number, i: any) => sum + i.quantity, 0);
        if (m.min_stock > 0 && materialStock <= m.min_stock) {
          lowStockCount++;
        }
      });

      setStats({
        totalItems: items.length,
        totalValue,
        lowStock: lowStockCount,
        totalWarehouses: warehousesRes.data.length
      });
    } catch (error) {
      console.error('Failed to fetch inventory stats', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Inventory Dashboard</h1>
          <p className="text-textSecondary mt-1">Overview of your warehouses and stock levels</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-textSecondary">Active Stock Items</p>
            <h3 className="text-2xl font-bold text-textPrimary mt-1">{stats.totalItems}</h3>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-start gap-4">
          <div className="p-3 bg-success/10 rounded-lg text-success">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-textSecondary">Total Inventory Value</p>
            <h3 className="text-2xl font-bold text-textPrimary mt-1">{formatCurrency(stats.totalValue)}</h3>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-start gap-4">
          <div className="p-3 bg-warning/10 rounded-lg text-warning">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-textSecondary">Low Stock Alerts</p>
            <h3 className="text-2xl font-bold text-textPrimary mt-1">{stats.lowStock}</h3>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-600">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-textSecondary">Warehouses</p>
            <h3 className="text-2xl font-bold text-textPrimary mt-1">{stats.totalWarehouses}</h3>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-textPrimary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <a href="/inventory/transactions/new" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:bg-secondary/10 hover:border-primary transition-all flex flex-col items-center justify-center text-center gap-3">
            <div className="p-4 bg-primary/10 rounded-full text-primary">
              <RefreshCw className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">New Transaction</h3>
              <p className="text-sm text-textSecondary">Record goods receipt, issue, or transfer</p>
            </div>
          </a>

          <a href="/inventory/balances" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:bg-secondary/10 hover:border-primary transition-all flex flex-col items-center justify-center text-center gap-3">
            <div className="p-4 bg-success/10 rounded-full text-success">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">Stock Balances</h3>
              <p className="text-sm text-textSecondary">View real-time inventory levels</p>
            </div>
          </a>

          <a href="/inventory/transactions" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:bg-secondary/10 hover:border-primary transition-all flex flex-col items-center justify-center text-center gap-3">
            <div className="p-4 bg-warning/10 rounded-full text-warning">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">Transaction History</h3>
              <p className="text-sm text-textSecondary">Track all inventory movements</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
