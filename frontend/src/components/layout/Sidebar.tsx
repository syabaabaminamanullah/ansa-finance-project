import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  Briefcase, 
  Calculator, 
  Users, 
  Settings, 
  FileText,
  Warehouse,
  Truck,
  Building,
  ChevronLeft,
  ChevronRight,
  Package,
  Folder
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ProfileModal } from './ProfileModal';
import { useProfileStore } from '../../store/profileStore';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Database, label: 'Master Data', path: '/master-data' },
  { icon: Briefcase, label: 'Project Management', path: '/projects' },
  { icon: Calculator, label: 'Finance & Accounting', path: '/finance' },
  { icon: FileText, label: 'Procurement', path: '/procurement' },
  { icon: Warehouse, label: 'Inventory', path: '/inventory' },
  { icon: Truck, label: 'Equipment & Rigs', path: '/equipment' },
  { icon: Building, label: 'Fixed Asset', path: '/assets' },
  { icon: Users, label: 'Human Resource', path: '/hr' },
  { icon: Folder, label: 'Document Explorer', path: '/documents' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { profile } = useProfileStore();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <aside className={clsx(
      "bg-card border-r border-border h-screen sticky top-0 flex flex-col transition-all duration-300",
      isCollapsed ? "w-20" : "w-72"
    )}>
      <div className="px-5 py-6 flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-primary flex items-center gap-2 overflow-hidden whitespace-nowrap truncate pr-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-card flex-shrink-0">A</div>
            <span className="truncate">ANSA Enterprise</span>
          </h1>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-card flex-shrink-0 mx-auto">A</div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={clsx(
            "p-1.5 rounded-lg text-textSecondary hover:bg-secondary/20 hover:text-textPrimary transition-colors",
            isCollapsed && "absolute -right-3 top-6 bg-card border border-border shadow-sm"
          )}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/');
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={twMerge(
                    clsx(
                      "flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isCollapsed ? "justify-center px-0" : "px-3",
                      isActive 
                        ? "bg-secondary/30 text-primary" 
                        : "text-textSecondary hover:bg-secondary/10 hover:text-textPrimary"
                    )
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={clsx("w-5 h-5 flex-shrink-0", isActive ? "text-primary" : "text-border")} />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-border">
        <button 
          onClick={() => setIsProfileModalOpen(true)}
          className={clsx(
            "w-full flex items-center gap-3 text-left hover:bg-secondary/10 p-2 rounded-xl transition-colors",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center font-bold flex-shrink-0 overflow-hidden">
            {profile.photo ? (
              <img src={profile.photo} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(profile.name)
            )}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-textPrimary truncate">{profile.name}</p>
              <p className="text-xs text-textSecondary truncate">{profile.email}</p>
            </div>
          )}
        </button>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </aside>
  );
}
