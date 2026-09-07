import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { ToastContainer } from '../components/ui/ToastContainer';
import { FloatingCalculator } from '../components/ui/FloatingCalculator';

export function MainLayout() {
  const location = useLocation();
  const isFullBleed = location.pathname === '/documents';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans text-textPrimary">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isFullBleed ? '' : 'p-4 sm:p-6'}`}>
          <div key={location.pathname} className="w-full h-full min-w-0 animate-in fade-in zoom-in-98 duration-150 ease-out">
            <Outlet />
          </div>
        </main>
      </div>
      <ToastContainer />
      <FloatingCalculator />
    </div>
  );
}
