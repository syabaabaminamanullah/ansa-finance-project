import { Search, Bell, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <button className="lg:hidden text-textSecondary hover:text-textPrimary">
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input 
            type="text" 
            placeholder="Search transactions, projects, or documents (Ctrl+K)" 
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-textPrimary placeholder:text-textSecondary"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-textSecondary hidden sm:block">
          {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <button className="relative p-2 text-textSecondary hover:text-textPrimary hover:bg-background rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-card"></span>
        </button>
      </div>
    </header>
  );
}
