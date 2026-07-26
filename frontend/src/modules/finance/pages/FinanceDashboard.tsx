import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  FileSpreadsheet, 
  Receipt, 
  FileText,
  PieChart,
  CreditCard
} from 'lucide-react';

const financeCategories = [
  {
    title: 'Accounting & Operations',
    items: [
      { name: 'Direct Expenses', icon: CreditCard, path: '/finance/expenses', desc: 'Kas kecil, klaim, dan biaya operasional' },
      { name: 'Journal Entries', icon: BookOpen, path: '/finance/journals', desc: 'Manage manual and auto journals' },
      { name: 'All Journal Entries', icon: BookOpen, path: '/finance/all-journals', desc: 'Buku Jurnal Umum (Detail semua baris)' },
      { name: 'General Ledger', icon: FileSpreadsheet, path: '/finance/gl', desc: 'View mutasi per account (COA)' },
    ]
  },
  {
    title: 'Accounts Payable (AP)',
    items: [
      { name: 'AP Invoices', icon: Receipt, path: '/finance/ap-invoices', desc: 'Manage vendor bills and payments' },
    ]
  },
  {
    title: 'Accounts Receivable (AR)',
    items: [
      { name: 'AR Invoices', icon: FileText, path: '/finance/ar-invoices', desc: 'Manage customer invoices' },
      { name: 'AR Aging Report', icon: FileText, path: '/finance/ar-aging', desc: 'Laporan umur piutang / tunggakan' },
    ]
  },
  {
    title: 'Reports',
    items: [
      { name: 'Financial Reports', icon: PieChart, path: '/finance/reports', desc: 'Income Statement, Balance Sheet' },
      { name: 'Project Financials', icon: PieChart, path: '/finance/project-reports', desc: 'Budget vs Actual per Project' },
      { name: 'Asset Depreciation', icon: PieChart, path: '/finance/asset-depreciation', desc: 'Nilai buku & beban penyusutan' },
    ]
  }
];

export function FinanceDashboard() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Finance & Accounting</h1>
        <p className="text-textSecondary text-sm mt-1">Manage journals, ledgers, payables, receivables, and reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
        {financeCategories.map((category, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wider border-b border-border pb-2">
              {category.title}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {category.items.map((item, itemIdx) => (
                <Link 
                  key={itemIdx} 
                  to={item.path}
                  className="flex items-center gap-4 p-3 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all group"
                >
                  <div className="p-2 bg-background rounded-md text-textSecondary group-hover:bg-secondary/30 group-hover:text-primary transition-colors">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-textPrimary group-hover:text-primary transition-colors">{item.name}</h4>
                    <p className="text-xs text-textSecondary mt-0.5">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
