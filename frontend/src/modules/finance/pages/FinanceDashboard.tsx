import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  FileSpreadsheet, 
  Receipt, 
  FileText,
  PieChart,
  CreditCard,
  BrainCircuit
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
      { name: 'AP Aging Report', icon: Receipt, path: '/finance/ap-aging', desc: 'Laporan umur hutang vendor / jatuh tempo' },
    ]
  },
  {
    title: 'Accounts Receivable (AR)',
    items: [
      { name: 'Invoice Termin / Billing', icon: FileText, path: '/finance/billing', desc: 'Jadwal penagihan termin proyek & invoice A4' },
      { name: 'AR Invoices', icon: FileText, path: '/finance/ar-invoices', desc: 'Manage customer invoices' },
      { name: 'AR Aging Report', icon: FileText, path: '/finance/ar-aging', desc: 'Laporan umur piutang / tunggakan' },
    ]
  },
  {
    title: 'Reports & Intelligence',
    items: [
      { name: 'Smart Financial Model', icon: BrainCircuit, path: '/finance/smart-forecast', desc: 'Forecast kas cerdas, runway & kecukupan OPEX' },
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
          <div 
            key={idx} 
            className="space-y-4 animate-in fade-in zoom-in-95 duration-200 fill-mode-both"
          >
            <h3 className="text-sm font-semibold text-textSecondary uppercase tracking-wider border-b border-border pb-2">
              {category.title}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {category.items.map((item, itemIdx) => (
                <Link 
                  key={itemIdx} 
                  to={item.path}
                  className="flex items-center gap-4 p-3.5 bg-card border border-border rounded-xl hover:border-primary/60 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group active:scale-[0.98] animate-in fade-in zoom-in-95 fill-mode-both"
                >
                  <div className="p-2.5 bg-background rounded-lg text-textSecondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <item.icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-textPrimary group-hover:text-primary transition-colors">{item.name}</h4>
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
