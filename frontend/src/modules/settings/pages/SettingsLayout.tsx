import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Settings, Users, Palette, Shield, Database, LayoutTemplate } from 'lucide-react';

const settingsNav = [
  { name: 'General', path: '/settings', icon: Settings, exact: true },
  { name: 'User & Roles', path: '/settings/users', icon: Users },
  { name: 'Appearance', path: '/settings/appearance', icon: Palette },
  { name: 'Security', path: '/settings/security', icon: Shield },
  { name: 'Data Management', path: '/settings/data', icon: Database },
];

export function SettingsLayout() {
  const location = useLocation();

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Settings Internal Sidebar */}
      <div className="w-64 border-r border-border bg-card overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-primary" />
            Preferences
          </h2>
          <p className="text-xs text-textSecondary mt-1">Manage your enterprise system configurations</p>
        </div>
        
        <nav className="px-3 pb-6 space-y-1">
          {settingsNav.map((item) => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-textSecondary hover:bg-secondary/20 hover:text-textPrimary'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-background">
        <Outlet />
      </div>
    </div>
  );
}
