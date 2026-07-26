import { useState, useEffect } from 'react';
import { Plus, Search, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryTransactionApi } from '../../../services/api';

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function InventoryTransactionList() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await inventoryTransactionApi.getTransactions();
      setTransactions(res.data);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-textPrimary">Inventory Transactions</h1>
            <p className="text-textSecondary mt-1">Manage goods receipt, issuance, and transfers</p>
          </div>
        </div>
        <Link
          to="/inventory/transactions/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-card rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          New Transaction
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-textSecondary uppercase bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Trans. No</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Source</th>
                <th className="px-6 py-4 font-medium">Destination</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-textSecondary">Loading transactions...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-textSecondary">No transactions found</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-textSecondary">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-6 py-4 font-mono text-primary font-medium">{tx.transaction_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        tx.type === 'RECEIPT' ? 'bg-success/10 text-success' :
                        tx.type === 'ISSUE' ? 'bg-warning/10 text-warning' :
                        'bg-blue-500/10 text-blue-600'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-textSecondary">{tx.source_warehouse?.name || '-'}</td>
                    <td className="px-6 py-4 text-textSecondary">{tx.destination_warehouse?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.status === 'Posted' ? 'bg-success/10 text-success' : 'bg-secondary text-textSecondary'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
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
