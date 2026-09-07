import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string; // Format 'YYYY-MM-DD'
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
  align?: 'left' | 'right';
  placement?: 'top' | 'bottom' | 'auto';
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal...',
  required = false,
  disabled = false,
  className = '',
  minDate,
  maxDate,
  align = 'left',
  placement = 'auto',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Current view date (year & month)
  const initialDate = value ? new Date(value) : new Date();
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewYear, setViewYear] = useState(validInitialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(validInitialDate.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number; isAbove: boolean }>({
    left: 0,
    width: 320,
    isAbove: false,
  });

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Position calculation
  const calculatePosition = () => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const desiredWidth = 320;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const isAbove = placement === 'top' ? true : placement === 'bottom' ? false : spaceBelow < 340 && spaceAbove > spaceBelow;

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

  // Format date display
  const formatDisplayDate = (valStr: string) => {
    if (!valStr) return '';
    const [y, m, d] = valStr.split('-').map(Number);
    if (!y || !m || !d) return valStr;
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return valStr;
    
    return `${d.toString().padStart(2, '0')} ${MONTH_SHORT_ID[m - 1]} ${y}`;
  };

  // Days in month calculation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formatted = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const formatted = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    onChange(formatted);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Check if date is today
  const isToday = (day: number) => {
    const now = new Date();
    return (
      now.getDate() === day &&
      now.getMonth() === viewMonth &&
      now.getFullYear() === viewYear
    );
  };

  // Check if date is selected
  const isSelected = (day: number) => {
    if (!value) return false;
    const [y, m, d] = value.split('-').map(Number);
    return y === viewYear && m === viewMonth + 1 && d === day;
  };

  // Generate years list for quick year picker (-20 to +10 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 35 }, (_, i) => currentYear - 20 + i);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for HTML5 form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full px-3 py-2 bg-background border text-left rounded-lg text-sm transition-all flex items-center justify-between gap-2 shadow-xs ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-primary/5 bg-primary/5'
            : 'border-border hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-muted/20' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <CalendarIcon className={`w-4 h-4 shrink-0 transition-colors ${isOpen ? 'text-primary' : 'text-textSecondary'}`} />
          <span className={`text-sm truncate font-medium ${value ? 'text-textPrimary font-semibold' : 'text-textSecondary'}`}>
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-textSecondary">
          {value && !disabled && !required && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
              title="Hapus Tanggal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </button>

      {/* PORTAL CALENDAR POPUP */}
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
            className="bg-white dark:bg-zinc-900 border-2 border-primary/30 rounded-2xl shadow-2xl overflow-hidden animate-pop-center flex flex-col ring-1 ring-primary/10 p-3 select-none"
          >
            {/* Header: Month & Year Navigator */}
            <div className="flex items-center justify-between gap-1 mb-3 pb-2 border-b border-border/80">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-textPrimary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {MONTH_NAMES_ID.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold font-mono text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-textSecondary hover:text-textPrimary transition-colors"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day Names Row */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAY_NAMES_ID.map((day, idx) => (
                <div
                  key={idx}
                  className={`text-[11px] font-bold py-1 ${
                    idx === 0 ? 'text-danger/80' : 'text-textSecondary'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Previous month filler days */}
              {Array.from({ length: firstDayIndex }, (_, i) => {
                const prevDay = prevMonthDays - firstDayIndex + i + 1;
                return (
                  <div
                    key={`prev-${i}`}
                    className="h-8 flex items-center justify-center text-xs text-textSecondary/30 select-none font-medium"
                  >
                    {prevDay}
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const active = isSelected(dayNum);
                const today = isToday(dayNum);

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={`h-8 w-full rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                      active
                        ? 'bg-primary text-white font-bold shadow-md scale-105 ring-2 ring-primary/30'
                        : today
                        ? 'bg-primary/10 text-primary font-bold border border-primary/40 hover:bg-primary/20'
                        : 'text-textPrimary hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-primary'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Footer Quick Action Buttons */}
            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/80 text-xs">
              <button
                type="button"
                onClick={handleSelectToday}
                className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg text-[11px] transition-colors"
              >
                ⚡ Hari Ini
              </button>

              <div className="flex items-center gap-2">
                {value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-textSecondary hover:text-danger text-[11px] transition-colors"
                  >
                    Hapus
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-textPrimary font-medium rounded-lg text-[11px] transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
