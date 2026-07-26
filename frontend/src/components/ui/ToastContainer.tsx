import { useToastStore } from '../../store/toastStore';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

const toastStyles = {
  success: 'bg-success/10 border-success text-success',
  error: 'bg-danger/10 border-danger text-danger',
  warning: 'bg-warning/10 border-warning text-warning',
  info: 'bg-primary/10 border-primary text-primary',
};

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];
        
        return (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 border rounded-xl shadow-2xl backdrop-blur-md bg-white/95 dark:bg-card/95 transform transition-all duration-300 translate-y-0 opacity-100 ${toastStyles[toast.type].split(' ')[1]}`}
          >
            <div className={`mt-0.5 ${toastStyles[toast.type].split(' ')[2]}`}>
              <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-textPrimary">{toast.title}</h4>
              {toast.message && (
                <p className="text-xs text-textSecondary mt-1">{toast.message}</p>
              )}
            </div>
            
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-textSecondary hover:text-textPrimary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
