import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, Layers, X } from 'lucide-react';

export interface CoaAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance?: string;
  is_header?: boolean;
  is_active?: boolean;
}

interface CoaSelectProps {
  accounts: CoaAccount[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  filterType?: string; // e.g. 'expense', 'asset', 'revenue'
  placement?: 'top' | 'bottom' | 'auto';
  align?: 'left' | 'right';
  popupWidth?: string;
}

export function CoaSelect({
  accounts = [],
  value,
  onChange,
  placeholder = '-- Pilih Akun COA --',
  required = false,
  disabled = false,
  className = '',
  filterType,
  placement = 'auto',
  align = 'left',
}: CoaSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number; isAbove: boolean }>({
    left: 0,
    width: 460,
    isAbove: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter accounts by type if requested
  const filteredByType = useMemo(() => {
    if (!filterType) return accounts;
    const targetType = filterType.toLowerCase();
    return accounts.filter((acc) => {
      if (acc.account_type.toLowerCase() === targetType) return true;
      return false;
    });
  }, [accounts, filterType]);

  // Filter accounts by search query
  const filteredAccounts = useMemo(() => {
    if (!search.trim()) return filteredByType;
    const q = search.toLowerCase().trim();
    return filteredByType.filter(
      (acc) =>
        acc.account_code.toLowerCase().includes(q) ||
        acc.account_name.toLowerCase().includes(q)
    );
  }, [filteredByType, search]);

  // Selected account
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === value);
  }, [accounts, value]);

  // Calculate position when opening (ALWAYS UPWARDS / DI ATAS)
  const calculatePosition = () => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const desiredWidth = Math.min(Math.max(rect.width, 540), window.innerWidth - 32);
    
    // Always open upwards unless explicitly set to 'bottom'
    const isAbove = placement !== 'bottom';

    let left = align === 'right' ? rect.right - desiredWidth : rect.left;
    // Boundary checks
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

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (account: CoaAccount) => {
    if (account.is_header) return; // Prevent selecting header
    onChange(account.id);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for HTML form validation if required */}
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
        className={`w-full px-3 py-2 bg-background border text-left rounded-lg text-sm transition-all flex items-center justify-between gap-2 shadow-sm ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 shadow-primary/5'
            : 'border-border hover:border-textSecondary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-muted/20' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedAccount ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold border border-primary/20 shrink-0">
                {selectedAccount.account_code}
              </span>
              <span className="font-medium text-textPrimary truncate">
                {selectedAccount.account_name}
              </span>
            </div>
          ) : (
            <span className="text-textSecondary text-xs">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-textSecondary">
          {selectedAccount && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
              title="Hapus Pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </div>
      </button>

      {/* PORTAL DROPDOWN MENU (RENDERED DIRECTLY TO BODY - ZERO CLIPPING GUARANTEED) */}
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
            className="bg-white dark:bg-zinc-900 border-2 border-primary/40 rounded-xl shadow-2xl overflow-hidden animate-pop-center flex flex-col max-h-[420px]"
          >
            {/* Search Header */}
            <div className="p-2.5 border-b border-border bg-zinc-50 dark:bg-zinc-950 sticky top-0 z-20 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-textSecondary absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ketik nomor atau nama akun (cth: 513, Bensin, Mandiri)..."
                  className="w-full pl-8 pr-8 py-2 bg-white dark:bg-zinc-900 border border-border rounded-lg text-xs text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 text-textSecondary hover:text-textPrimary p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Account Options List - Fully Scrollable */}
            <div
              ref={listRef}
              className="overflow-y-auto flex-1 p-2 space-y-1.5 overscroll-contain bg-white dark:bg-zinc-900"
              style={{ maxHeight: '320px' }}
            >
              {filteredAccounts.length === 0 ? (
                <div className="py-6 text-center text-textSecondary text-xs space-y-1">
                  <p className="font-semibold text-textPrimary">Tidak ditemukan akun yang cocok</p>
                  <p className="text-[11px]">Coba cari dengan kata kunci lain.</p>
                </div>
              ) : (
                filteredAccounts.map((account) => {
                  const isSelected = account.id === value;

                  // 1. RENDER HEADER ACCOUNT (SOLID BANNER)
                  if (account.is_header) {
                    return (
                      <div
                        key={account.id}
                        className="px-3 py-1.5 mt-1.5 mb-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 select-none flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-mono text-xs font-black text-primary tracking-tight shrink-0">
                            [{account.account_code}]
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider truncate text-textPrimary">
                            {account.account_name}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shrink-0">
                          HEADER
                        </span>
                      </div>
                    );
                  }

                  // 2. RENDER DETAIL TRANSACTION ACCOUNT (CRISP SOLID CARD)
                  return (
                    <div
                      key={account.id}
                      onClick={() => handleSelect(account)}
                      className={`px-3 py-2 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between gap-2.5 border ml-2 ${
                        isSelected
                          ? 'bg-primary text-white font-semibold border-primary shadow-sm'
                          : 'bg-zinc-50 dark:bg-zinc-800/60 hover:bg-primary/10 border-zinc-200 dark:border-zinc-700/80 text-textPrimary hover:text-primary hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded border shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white border-white/40 font-bold'
                              : 'bg-white dark:bg-zinc-900 text-primary border-primary/25 font-bold shadow-xs'
                          }`}
                        >
                          {account.account_code}
                        </span>
                        <span className="truncate font-medium text-textPrimary">
                          {account.account_name}
                        </span>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-white shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Footer Summary */}
            <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border-t border-border flex items-center justify-between text-[11px] text-textSecondary shrink-0">
              <span>{filteredAccounts.filter((a) => !a.is_header).length} akun aktif</span>
              <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                <Layers className="w-3 h-3" /> Header otomatis dikelompokkan
              </span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

