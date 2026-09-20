import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

interface MonthPickerProps {
  value: string; // Format 'YYYY-MM'
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
  showQuickNav?: boolean;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export function MonthPicker({
  value,
  onChange,
  disabled = false,
  className = '',
  align = 'right',
  showQuickNav = true
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial year and month
  const parseValue = (val: string) => {
    if (!val) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    const [y, m] = val.split('-').map(Number);
    if (!y || isNaN(m)) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    return { year: y, month: m - 1 };
  };

  const currentParsed = parseValue(value);
  const [viewYear, setViewYear] = useState(currentParsed.year);

  // Synchronize viewYear if value changes externally
  useEffect(() => {
    const { year } = parseValue(value);
    setViewYear(year);
  }, [value]);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number; isAbove: boolean }>({
    left: 0,
    width: 280,
    isAbove: false,
  });

  const calculatePosition = () => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const desiredWidth = 280;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const isAbove = spaceBelow < 280 && spaceAbove > spaceBelow;

    let left = align === 'right' ? rect.right - desiredWidth : rect.left;
    if (left < 16) left = 16;
    if (left + desiredWidth > window.innerWidth - 16) {
      left = window.innerWidth - 16 - desiredWidth;
    }

    return {
      top: isAbove ? undefined : rect.bottom + 6,
      bottom: isAbove ? window.innerHeight - rect.top + 6 : undefined,
      left,
      width: desiredWidth,
      isAbove,
    };
  };

  const updatePosition = () => {
    const nextCoords = calculatePosition();
    if (nextCoords) setCoords(nextCoords);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      const nextCoords = calculatePosition();
      if (nextCoords) setCoords(nextCoords);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        popupRef.current && !popupRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const handleSelectMonth = (monthIdx: number) => {
    const formattedMonth = String(monthIdx + 1).padStart(2, '0');
    const nextVal = `${viewYear}-${formattedMonth}`;
    onChange(nextVal);
    setIsOpen(false);
  };

  const handleQuickPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { year, month } = parseValue(value);
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    const formatted = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
    onChange(formatted);
  };

  const handleQuickNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { year, month } = parseValue(value);
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    const formatted = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
    onChange(formatted);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    setViewYear(y);
    onChange(`${y}-${m}`);
    setIsOpen(false);
  };

  // Real world today
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();

  const displayLabel = `${MONTH_NAMES_ID[currentParsed.month]} ${currentParsed.year}`;

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Container with optional quick prev/next buttons */}
      <div className="inline-flex items-center rounded-xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all p-0.5">
        {showQuickNav && (
          <button
            type="button"
            onClick={handleQuickPrev}
            disabled={disabled}
            title="Bulan Sebelumnya"
            className="p-1.5 text-textSecondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Main Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-textPrimary hover:text-primary transition-colors cursor-pointer select-none"
        >
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          <span className="tracking-tight whitespace-nowrap">{displayLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-textSecondary transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
        </button>

        {showQuickNav && (
          <button
            type="button"
            onClick={handleQuickNext}
            disabled={disabled}
            title="Bulan Berikutnya"
            className="p-1.5 text-textSecondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* PORTAL MONTH PICKER DROPDOWN */}
      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden p-3.5 select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5 dark:ring-white/10"
          >
            {/* Header: Year Selector */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
              <button
                type="button"
                onClick={() => setViewYear(prev => prev - 1)}
                className="p-1.5 text-textSecondary hover:text-textPrimary hover:bg-secondary/20 rounded-lg transition-colors cursor-pointer"
                title="Tahun Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="font-bold text-base font-mono text-primary tracking-wide">
                {viewYear}
              </div>

              <button
                type="button"
                onClick={() => setViewYear(prev => prev + 1)}
                className="p-1.5 text-textSecondary hover:text-textPrimary hover:bg-secondary/20 rounded-lg transition-colors cursor-pointer"
                title="Tahun Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Months 4x3 Grid */}
            <div className="grid grid-cols-3 gap-2">
              {MONTH_SHORT_ID.map((mShort, idx) => {
                const isSelected = viewYear === currentParsed.year && idx === currentParsed.month;
                const isToday = viewYear === todayYear && idx === todayMonth;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectMonth(idx)}
                    className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm font-bold scale-[1.02]'
                        : isToday
                        ? 'border border-primary/50 text-primary bg-primary/5 hover:bg-primary/15'
                        : 'text-textPrimary hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    {mShort}
                  </button>
                );
              })}
            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
              <button
                type="button"
                onClick={handleSetThisMonth}
                className="text-xs font-semibold text-primary hover:underline transition-all cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-textSecondary hover:text-textPrimary px-2 py-1 rounded hover:bg-secondary/20 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
