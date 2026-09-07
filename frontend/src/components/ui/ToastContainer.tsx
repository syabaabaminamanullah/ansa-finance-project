import { useToastStore } from '../../store/toastStore';
import { XCircle, AlertCircle, Info, X, Sparkles } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 max-w-md w-[92vw] pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div 
            key={toast.id}
            className={`pointer-events-auto relative w-full overflow-hidden flex items-center gap-3.5 p-4 border rounded-2xl shadow-[0_16px_45px_-8px_rgba(41,72,37,0.22)] backdrop-blur-xl transition-all duration-300 animate-toast-success ${
              isSuccess 
                ? 'bg-[#FAF8F2]/95 dark:bg-[#1B241A]/95 border-[#7F8F74]/50 ring-1 ring-[#D4AF37]/35 shadow-[#294825]/15' 
                : isError
                ? 'bg-[#FAF8F2]/95 dark:bg-[#1B241A]/95 border-rose-500/40 ring-1 ring-rose-500/25 shadow-rose-900/15'
                : isWarning
                ? 'bg-[#FAF8F2]/95 dark:bg-[#1B241A]/95 border-amber-500/40 ring-1 ring-amber-500/25 shadow-amber-900/15'
                : 'bg-[#FAF8F2]/95 dark:bg-[#1B241A]/95 border-[#D4AF37]/50 ring-1 ring-[#D4AF37]/30 shadow-[#D4AF37]/15'
            }`}
          >
            {/* Animated Icon Avatar with Luxury Palette */}
            {isSuccess && (
              <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-[#CAD5B5]/60 dark:bg-[#294825]/60 animate-pulse-halo"></span>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#294825] via-[#355830] to-[#1F371C] border border-[#D4AF37]/60 flex items-center justify-center shadow-lg shadow-[#294825]/40 animate-checkmark-circle">
                  <svg className="w-5 h-5 text-[#FAF8F2] stroke-current fill-none stroke-[3]" viewBox="0 0 24 24">
                    <path className="animate-checkmark-stroke" d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] absolute -top-1 -right-1 animate-bounce" />
              </div>
            )}

            {isError && (
              <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center shadow-lg shadow-rose-900/30">
                  <XCircle className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
              </div>
            )}

            {isWarning && (
              <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
                  <AlertCircle className="w-5 h-5 text-white stroke-[2.5]" />
                </div>
              </div>
            )}

            {!isSuccess && !isError && !isWarning && (
              <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8972E] flex items-center justify-center shadow-lg shadow-[#D4AF37]/30">
                  <Info className="w-5 h-5 text-[#294825] stroke-[2.5]" />
                </div>
              </div>
            )}
            
            {/* Message Body */}
            <div className="flex-1 pr-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#294825] dark:text-[#FAF8F2] tracking-tight">{toast.title}</h4>
                {isSuccess && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#294825]/10 dark:bg-[#D4AF37]/20 text-[#294825] dark:text-[#D4AF37] border border-[#294825]/20 dark:border-[#D4AF37]/30">
                    Done
                  </span>
                )}
              </div>
              {toast.message && (
                <p className="text-xs text-[#52644D] dark:text-[#B5C7AF] mt-0.5 leading-relaxed font-medium">{toast.message}</p>
              )}
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-[#7F8F74] hover:text-[#294825] dark:hover:text-[#FAF8F2] p-1.5 rounded-lg hover:bg-[#CAD5B5]/30 transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Countdown Progress Bar (Forest Green to Regal Gold gradient) */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#CAD5B5]/30 dark:bg-[#294825]/30 rounded-b-2xl overflow-hidden">
              <div className={`h-full animate-progress-shrink ${
                isSuccess 
                  ? 'bg-gradient-to-r from-[#294825] via-[#4D7C45] to-[#D4AF37]' 
                  : isError 
                  ? 'bg-rose-500' 
                  : isWarning 
                  ? 'bg-amber-500' 
                  : 'bg-[#D4AF37]'
              }`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

