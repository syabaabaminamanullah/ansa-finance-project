import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Wallet, 
  FileSpreadsheet, 
  Receipt, 
  Coins, 
  Landmark, 
  Briefcase, 
  Map, 
  Layers, 
  ActivitySquare, 
  Users, 
  UserCircle, 
  Users2, 
  Clock, 
  Truck, 
  Wrench, 
  Warehouse, 
  Package, 
  Box, 
  ShieldCheck, 
  UserCog, 
  Key
} from 'lucide-react';

const masterDataCategories = [
  {
    title: 'Organization',
    items: [
      { name: 'Company', icon: Building2, path: '/master-data/company', desc: 'Manage legal entities' },
      { name: 'Branch', icon: MapPin, path: '/master-data/branch', desc: 'Manage branch offices' },
      { name: 'Cost Center', icon: Wallet, path: '/master-data/cost-center', desc: 'Manage cost centers' },
    ]
  },
  {
    title: 'Financials',
    items: [
      { name: 'Chart of Account', icon: FileSpreadsheet, path: '/master-data/coa', desc: 'GL accounts mapping' },
      { name: 'Tax Code', icon: Receipt, path: '/master-data/tax', desc: 'Tax rates & rules' },
      { name: 'Currency', icon: Coins, path: '/master-data/currency', desc: 'Foreign exchange' },
      { name: 'Bank', icon: Landmark, path: '/master-data/bank', desc: 'Bank accounts' },
    ]
  },
  {
    title: 'Project Structure',
    items: [
      { name: 'Project', icon: Briefcase, path: '/master-data/project', desc: 'Project contracts' },
      { name: 'Area', icon: Map, path: '/master-data/area', desc: 'Project locations' },
      { name: 'Work Package', icon: Layers, path: '/master-data/work-package', desc: 'WBS structure' },
      { name: 'Activity', icon: ActivitySquare, path: '/master-data/activity', desc: 'Task activities' },
    ]
  },
  {
    title: 'Stakeholders',
    items: [
      { name: 'Customer', icon: Users, path: '/master-data/customer', desc: 'Client database' },
      { name: 'Vendor', icon: Building2, path: '/master-data/vendor', desc: 'Supplier database' },
    ]
  },
  {
    title: 'Human Resources',
    items: [
      { name: 'Employee', icon: UserCircle, path: '/master-data/employee', desc: 'Staff records' },
      { name: 'Crew', icon: Users2, path: '/master-data/crew', desc: 'Field teams' },
      { name: 'Shift', icon: Clock, path: '/master-data/shift', desc: 'Working hours' },
    ]
  },
  {
    title: 'Asset & Inventory',
    items: [
      { name: 'Rig', icon: Truck, path: '/master-data/rig', desc: 'Drilling rigs' },
      { name: 'Equipment', icon: Wrench, path: '/master-data/equipment', desc: 'Tools & machines' },
      { name: 'Warehouse', icon: Warehouse, path: '/master-data/warehouse', desc: 'Storage locations' },
      { name: 'Material', icon: Package, path: '/master-data/material', desc: 'Raw materials' },
      { name: 'Inventory Item', icon: Box, path: '/master-data/inventory', desc: 'Stock items' },
    ]
  },
  {
    title: 'System Security',
    items: [
      { name: 'User', icon: UserCog, path: '/master-data/user', desc: 'System accounts' },
      { name: 'Role', icon: ShieldCheck, path: '/master-data/role', desc: 'Access roles' },
      { name: 'Permission', icon: Key, path: '/master-data/permission', desc: 'Access rights' },
    ]
  }
];

export function MasterDataPage() {
  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Master Data Management</h1>
        <p className="text-textSecondary text-sm mt-1">Configure and manage all core entities for the ERP system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
        {masterDataCategories.map((category, idx) => (
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
