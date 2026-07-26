import React, { useState, useEffect } from 'react';
import { assetsApi } from '../../../services/api';
import { Link } from 'react-router-dom';
import { Building, TrendingDown, DollarSign, Package } from 'lucide-react';

export function FixedAssetDashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setIsLoading(true);
        const res = await assetsApi.getFixedAssets();
        setAssets(res.data);
      } catch (error) {
        console.error('Failed to fetch fixed assets', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, []);

  const totalPurchasePrice = assets.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
  const totalAccumulatedDep = assets.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0);
  const totalBookValue = assets.reduce((sum, a) => sum + (a.book_value || 0), 0);
  const activeAssetsCount = assets.filter((a) => a.status === 'Active').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Fixed Assets Dashboard</h1>
        <p className="text-textSecondary mt-1">Overview of company assets, valuation, and depreciation.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textSecondary">Total Active Assets</h3>
            <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-textPrimary">{isLoading ? '-' : activeAssetsCount}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textSecondary">Total Purchase Value</h3>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-xl font-bold text-primary">{isLoading ? '-' : `Rp ${totalPurchasePrice.toLocaleString()}`}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textSecondary">Accumulated Dep.</h3>
            <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-danger" />
            </div>
          </div>
          <p className="text-xl font-bold text-danger">{isLoading ? '-' : `Rp ${totalAccumulatedDep.toLocaleString()}`}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textSecondary">Net Book Value</h3>
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
              <Building className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-xl font-bold text-success">{isLoading ? '-' : `Rp ${totalBookValue.toLocaleString()}`}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-textPrimary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/assets/list" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:bg-secondary/10 hover:border-primary transition-all flex flex-col items-center justify-center text-center gap-3 group">
            <div className="p-4 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">Asset List</h3>
              <p className="text-sm text-textSecondary">Manage master data and register new fixed assets</p>
            </div>
          </Link>
          <Link to="/assets/list" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:bg-secondary/10 hover:border-primary transition-all flex flex-col items-center justify-center text-center gap-3 group">
            <div className="p-4 bg-warning/10 rounded-full text-warning group-hover:scale-110 transition-transform">
              <TrendingDown className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-textPrimary">Run Depreciation</h3>
              <p className="text-sm text-textSecondary">Process monthly depreciation automatically into journals</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
