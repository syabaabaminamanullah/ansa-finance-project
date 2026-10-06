import { useState, useEffect, useMemo } from 'react';
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
  Folder,
  LogOut
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ProfileModal } from './ProfileModal';
import { Modal } from '../ui/Modal';
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
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const { profile, fetchProfile } = useProfileStore();

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Determine which menu item is active (longest matching prefix wins to prevent parent & child collisions)
  const activeItem = useMemo(() => {
    let matched = null;
    let maxLength = 0;
    for (const item of menuItems) {
      if (item.path === '/') {
        if (location.pathname === '/' || location.pathname === '/dashboard') {
          if (maxLength === 0) {
            matched = item;
          }
        }
      } else if (
        location.pathname === item.path || 
        location.pathname.startsWith(item.path + '/') || 
        location.pathname.startsWith(item.path + '?')
      ) {
        if (item.path.length > maxLength) {
          maxLength = item.path.length;
          matched = item;
        }
      }
    }
    return matched;
  }, [location.pathname]);

  return (
    <aside className={clsx(
      "bg-card border-r border-border h-screen sticky top-0 flex flex-col transition-all duration-300",
      isCollapsed ? "w-20" : "w-72"
    )}>
      <div className="px-5 py-6 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap truncate pr-2">
            <img 
              src="/ansa-icon.png" 
              alt="ANSA Logo" 
              className="w-9 h-9 object-contain flex-shrink-0" 
            />
            <div className="flex flex-col min-w-0">
              <span className="text-base font-extrabold text-primary tracking-tight truncate leading-tight">
                ANSA Enterprise
              </span>
              <span className="text-[11px] font-bold text-textSecondary tracking-wider uppercase truncate leading-tight mt-0.5">
                ANSA Geo Finance
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <img 
            src="/ansa-icon.png" 
            alt="ANSA Logo" 
            className="w-8 h-8 object-contain flex-shrink-0 mx-auto" 
          />
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
          {menuItems.map((item, index) => {
            const isActive = activeItem?.path === item.path;
            return (
              <li 
                key={item.path}
                className="animate-in fade-in zoom-in-95 duration-150 fill-mode-both"
              >
                <Link
                  to={item.path}
                  className={twMerge(
                    clsx(
                      "relative group flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                      isCollapsed ? "justify-center px-0" : "px-3.5",
                      isActive 
                        ? "bg-primary/10 text-primary font-semibold shadow-sm" 
                        : "text-textSecondary hover:bg-secondary/20 hover:text-textPrimary hover:translate-x-1"
                    )
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full animate-in fade-in zoom-in-50 duration-200" />
                  )}

                  <item.icon className={clsx(
                    "w-5 h-5 flex-shrink-0 transition-all duration-200 group-hover:scale-110", 
                    isActive ? "text-primary" : "text-textSecondary group-hover:text-primary/80"
                  )} />
                  {!isCollapsed && <span className="whitespace-nowrap transition-colors">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-border flex flex-col gap-2">
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
        
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className={clsx(
            "w-full flex items-center gap-2 p-2 rounded-xl transition-colors text-red-600 bg-red-50 hover:bg-red-100",
            isCollapsed ? "justify-center" : "justify-center font-medium"
          )}
          title="Keluar / Logout"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && "Keluar"}
        </button>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Konfirmasi Logout"
        maxWidth="max-w-sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Keluar dari Akun?</h3>
          <p className="text-sm text-gray-500 mb-6">
            Apakah Anda yakin ingin keluar dari sistem? Anda harus masuk kembali untuk melanjutkan.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Batal
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('ansa_auth');
                window.location.reload();
              }}
              className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Ya, Keluar
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
