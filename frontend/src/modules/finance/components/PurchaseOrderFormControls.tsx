import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  ListOrdered,
  List,
  Trash2,
  Info,
  Wand2,
  HardHat,
  Package,
  Truck,
  Factory,
  Laptop,
  Building2,
  Clock,
  Banknote,
  FileCheck,
  CalendarClock,
  Briefcase,
  Users,
  Search
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* =========================================================================
 * 1. REFINED CATEGORY SELECT (Klasifikasi / Tipe Pengadaan - Material Icons)
 * ========================================================================= */

export interface ProcurementCategory {
  id: string;
  name: string;
  Icon: LucideIcon;
  subtitle: string;
  accountCode: string;
  accountType: string;
}

export const PROCUREMENT_CATEGORIES: ProcurementCategory[] = [
  {
    id: 'Jasa Subkontraktor',
    name: 'Jasa Subkontraktor',
    Icon: HardHat,
    subtitle: 'Rebar, Boring, Fabrikasi & Konstruksi Lapangan',
    accountCode: '51100',
    accountType: 'COGS Proyek',
  },
  {
    id: 'Material Habis Pakai Proyek',
    name: 'Material Habis Pakai Proyek',
    Icon: Package,
    subtitle: 'Besi Beton, Semen, Readymix, Solar, Kawat Bendrat',
    accountCode: '51200',
    accountType: 'COGS Proyek',
  },
  {
    id: 'Sewa Alat Proyek',
    name: 'Sewa Alat Proyek',
    Icon: Truck,
    subtitle: 'Alat Berat, Rig Bor, Crane, Genset & Mobilisasi',
    accountCode: '51300',
    accountType: 'COGS Proyek',
  },
  {
    id: 'Aset Mesin / Alat Berat (CAPEX)',
    name: 'Aset Mesin / Rig Bor (CAPEX)',
    Icon: Factory,
    subtitle: 'Kapitalisasi Mesin & Alat Berat Baru (Neraca)',
    accountCode: '12100',
    accountType: 'CAPEX Neraca',
  },
  {
    id: 'Aset Peralatan Kantor (CAPEX)',
    name: 'Aset Peralatan Kantor (CAPEX)',
    Icon: Laptop,
    subtitle: 'Komputer, Printer, Furniture Office (Neraca)',
    accountCode: '12400',
    accountType: 'CAPEX Neraca',
  },
  {
    id: 'Beban Operasional Kantor (OPEX)',
    name: 'Beban Operasional Kantor (OPEX)',
    Icon: Building2,
    subtitle: 'ATK, Utilitas, Pemeliharaan & Umum Kantor',
    accountCode: '61700',
    accountType: 'OPEX Overhead',
  },
];

interface PremiumCategorySelectProps {
  value: string;
  onChange: (val: string) => void;
}

export const PremiumCategorySelect: React.FC<PremiumCategorySelectProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = PROCUREMENT_CATEGORIES.find((c) => c.id === value) || PROCUREMENT_CATEGORIES[0];
  const SelectedIcon = selected.Icon;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button - Clean & Sleek */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-background hover:bg-card border border-border rounded-xl text-left transition-all shadow-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:text-primary transition-colors">
            <SelectedIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <span className="font-semibold text-textPrimary text-xs truncate">
              {selected.name}
            </span>
            <span className="text-[10px] font-mono text-textSecondary bg-slate-100 dark:bg-slate-800 border border-border px-1.5 py-0.2 rounded flex-shrink-0">
              Akun {selected.accountCode}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu - Minimalist & Compact */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-border/60 flex justify-between items-center">
            <span>Klasifikasi Pengadaan</span>
            <span className="font-mono text-[9px] text-textSecondary">COA PSAK</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
            {PROCUREMENT_CATEGORIES.map((cat) => {
              const isSelected = cat.id === value;
              const IconComponent = cat.Icon;

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    onChange(cat.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-textPrimary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-textPrimary'}`}>
                        {cat.name}
                      </p>
                      <p className="text-[11px] text-textSecondary truncate">{cat.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] font-mono text-textSecondary bg-background border border-border px-1.5 py-0.5 rounded">
                      {cat.accountCode}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
 * 1b. PREMIUM PAYMENT TERMS SELECT (Syarat Pembayaran / TOP - Material Icons)
 * ========================================================================= */

export interface PaymentTermOption {
  id: string;
  name: string;
  Icon: LucideIcon;
  subtitle: string;
  badge: string;
}

export const PAYMENT_TERM_OPTIONS: PaymentTermOption[] = [
  {
    id: 'Net 7 Hari (1 Minggu)',
    name: 'Net 7 Hari',
    Icon: Clock,
    subtitle: '1 Minggu setelah terbit PO',
    badge: '7 Hari',
  },
  {
    id: 'Net 14 Hari (2 Minggu)',
    name: 'Net 14 Hari',
    Icon: Clock,
    subtitle: '2 Minggu setelah terbit PO',
    badge: '14 Hari',
  },
  {
    id: 'Net 30 Hari (1 Bulan)',
    name: 'Net 30 Hari',
    Icon: CalendarIcon,
    subtitle: 'Standar Korporat (1 Bulan)',
    badge: '30 Hari',
  },
  {
    id: 'Cash on Delivery (COD)',
    name: 'Cash on Delivery (COD)',
    Icon: Banknote,
    subtitle: 'Pembayaran tunai saat barang tiba',
    badge: 'COD',
  },
  {
    id: 'Setelah Selesai Pekerjaan / BAST',
    name: 'Selesai Pekerjaan / BAST',
    Icon: FileCheck,
    subtitle: 'Pelunasan 100% pasca opname & BAST',
    badge: 'BAST 100%',
  },
  {
    id: 'Custom',
    name: 'Custom Jatuh Tempo',
    Icon: CalendarClock,
    subtitle: 'Tentukan tanggal jatuh tempo manual',
    badge: 'Custom',
  },
];

interface PremiumPaymentTermsSelectProps {
  value: string;
  onChange: (val: string) => void;
}

export const PremiumPaymentTermsSelect: React.FC<PremiumPaymentTermsSelectProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = PAYMENT_TERM_OPTIONS.find((p) => p.id === value || value.startsWith(p.name)) || PAYMENT_TERM_OPTIONS[0];
  const SelectedIcon = selected.Icon;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button - Clean & Sleek matching PremiumCategorySelect */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-background hover:bg-card border border-border rounded-xl text-left transition-all shadow-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:text-primary transition-colors">
            <SelectedIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex items-center gap-2">
            <span className="font-semibold text-textPrimary text-xs truncate">
              {selected.name}
            </span>
            <span className="text-[10px] font-mono text-textSecondary bg-slate-100 dark:bg-slate-800 border border-border px-1.5 py-0.2 rounded flex-shrink-0">
              {selected.badge}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu - Minimalist & Compact */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-border/60 flex justify-between items-center">
            <span>Pilih Syarat Pembayaran (TOP)</span>
            <span className="font-mono text-[9px] text-textSecondary">Termin</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
            {PAYMENT_TERM_OPTIONS.map((opt) => {
              const isSelected = opt.id === value || value.startsWith(opt.name);
              const IconComponent = opt.Icon;

              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-textPrimary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-textPrimary'}`}>
                        {opt.name}
                      </p>
                      <p className="text-[11px] text-textSecondary truncate">{opt.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] font-mono text-textSecondary bg-background border border-border px-1.5 py-0.5 rounded">
                      {opt.badge}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
 * 1c. PREMIUM PROJECT SELECT (Proyek Alokasi Biaya - Material Icons & Search)
 * ========================================================================= */

interface PremiumProjectSelectProps {
  projects: Array<{ id: string; name: string; code?: string; client_name?: string }>;
  value: string;
  onChange: (id: string) => void;
}

export const PremiumProjectSelect: React.FC<PremiumProjectSelectProps> = ({ projects, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedProject = projects.find((p) => p.id === value);
  const isGeneralExpense = !value || value === '';

  const filteredProjects = projects.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.client_name && p.client_name.toLowerCase().includes(q))
    );
  });

  const showGeneralOption = !searchTerm.trim() || 'general expense kantor non-proyek overhead'.includes(searchTerm.toLowerCase());

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button - Clean, Compact & Perfectly Balanced with Tanggal Terbit */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-background hover:bg-card border border-border rounded-xl text-left transition-all shadow-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:text-primary transition-colors">
            {isGeneralExpense ? <Building2 className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-textPrimary text-xs truncate">
              {isGeneralExpense ? 'General Expense (Kantor)' : (selectedProject?.name || 'Pilih Proyek')}
            </p>
            <p className="text-[10px] text-textSecondary font-mono truncate">
              {isGeneralExpense ? 'Non-Proyek' : (selectedProject?.code || 'Proyek Lapangan')}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Floating Popover Menu - Positioned inwards (right-0) so it never overflows or distorts the container */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-[380px] max-w-[calc(100vw-32px)] bg-card border border-border rounded-xl shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-textSecondary absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama proyek, kode proyek..."
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="px-2 py-0.5 text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-border/60 flex justify-between items-center">
            <span>Pilih Proyek / Alokasi Biaya</span>
            <span className="font-mono text-[9px] text-textSecondary">
              {filteredProjects.length + (showGeneralOption ? 1 : 0)} Opsi
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
            {/* General Expense Option */}
            {showGeneralOption && (
              <div
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                  isGeneralExpense
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-textPrimary'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isGeneralExpense ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${isGeneralExpense ? 'text-primary' : 'text-textPrimary'}`}>
                      -- General Expense (Kantor) --
                    </p>
                    <p className="text-[11px] text-textSecondary truncate">Beban Operasional Kantor / Overhead</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-textSecondary bg-background border border-border px-1.5 py-0.5 rounded">
                    Kantor
                  </span>
                  {isGeneralExpense && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />}
                </div>
              </div>
            )}

            {/* Project List */}
            {filteredProjects.map((p) => {
              const isSelected = p.id === value;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-textPrimary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-textPrimary'} truncate`}>
                        {p.name}
                      </p>
                      <p className="text-[11px] text-textSecondary truncate">
                        {p.code ? `Kode: ${p.code}` : 'Proyek Lapangan'} {p.client_name ? `• ${p.client_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {p.code && (
                      <span className="text-[10px] font-mono text-textSecondary bg-background border border-border px-1.5 py-0.5 rounded">
                        {p.code}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />}
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && !showGeneralOption && (
              <div className="text-center py-4 text-xs text-textSecondary">
                Tidak ada proyek yang sesuai dengan pencarian
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
 * 1d. PREMIUM VENDOR SELECT (Vendor / Rekanan Pengadaan - Material Icons & Search)
 * ========================================================================= */

interface PremiumVendorSelectProps {
  vendors: Array<{ id: string; name: string; code?: string; address?: string; phone?: string; contact_person?: string }>;
  value: string;
  onChange: (id: string) => void;
}

export const PremiumVendorSelect: React.FC<PremiumVendorSelectProps> = ({ vendors, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedVendor = vendors.find((v) => v.id === value);

  const filteredVendors = vendors.filter((v) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      (v.code && v.code.toLowerCase().includes(q)) ||
      (v.address && v.address.toLowerCase().includes(q)) ||
      (v.phone && v.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button - Clean & Informative 2-line layout */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 bg-background hover:bg-card border border-border rounded-xl text-left transition-all shadow-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:text-primary transition-colors">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-xs truncate ${selectedVendor ? 'text-textPrimary' : 'text-textSecondary'}`}>
                {selectedVendor ? selectedVendor.name : '-- Pilih Vendor / Rekanan --'}
              </span>
              {selectedVendor?.code && (
                <span className="text-[10px] font-mono text-textSecondary bg-slate-100 dark:bg-slate-800 border border-border px-1.5 py-0.2 rounded flex-shrink-0">
                  {selectedVendor.code}
                </span>
              )}
            </div>
            <p className="text-[11px] text-textSecondary truncate mt-0.5">
              {selectedVendor?.address
                ? selectedVendor.address
                : (selectedVendor ? 'Rekanan Terdaftar' : 'Pilih rekanan/distributor untuk pengadaan barang atau jasa')}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Popover Menu with Quick Search */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 min-w-[340px] bg-card border border-border rounded-xl shadow-xl z-50 p-1.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-textSecondary absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama vendor, kode, atau alamat..."
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-textPrimary placeholder:text-textSecondary/60 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="px-2 py-0.5 text-[10px] font-semibold text-textSecondary uppercase tracking-wider border-b border-border/60 flex justify-between items-center">
            <span>Pilih Vendor / Rekanan Pengadaan</span>
            <span className="font-mono text-[9px] text-textSecondary">
              {filteredVendors.length} Rekanan
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
            {/* Reset / Unselect Option */}
            <div
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                !value
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-textSecondary'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-textSecondary">
                    -- Pilih Vendor / Rekanan --
                  </p>
                  <p className="text-[11px] text-textSecondary/70 truncate">Kosongkan pilihan vendor</p>
                </div>
              </div>
              {!value && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />}
            </div>

            {/* Vendor List */}
            {filteredVendors.map((v) => {
              const isSelected = v.id === value;
              return (
                <div
                  key={v.id}
                  onClick={() => {
                    onChange(v.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-textPrimary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-textPrimary'} truncate`}>
                        {v.name}
                      </p>
                      <p className="text-[11px] text-textSecondary truncate">
                        {v.address || (v.phone ? `Telp: ${v.phone}` : 'Rekanan Terdaftar')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {v.code && (
                      <span className="text-[10px] font-mono text-textSecondary bg-background border border-border px-1.5 py-0.5 rounded">
                        {v.code}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary stroke-[2.5]" />}
                  </div>
                </div>
              );
            })}

            {filteredVendors.length === 0 && (
              <div className="text-center py-4 text-xs text-textSecondary">
                Tidak ada vendor yang sesuai dengan pencarian
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
 * 2. PREMIUM DATE PICKER (Desain Kalender Modern & Minimalis)
 * ========================================================================= */

interface PremiumDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  placeholder?: string;
  quickPresets?: boolean;
}

export const PremiumDatePicker: React.FC<PremiumDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Pilih Tanggal...',
  quickPresets = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current date or today
  const currentDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth()); // 0-indexed

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Calculate days for the calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDate = (year: number, month: number, day: number) => {
    const yyyy = year;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  // Quick Preset Helper
  const applyPresetDays = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  // Format Indonesian readable label: e.g. "17 Sep 2026"
  const formatDisplayDate = (valStr: string) => {
    if (!valStr) return placeholder;
    try {
      const d = new Date(valStr + 'T00:00:00');
      if (isNaN(d.getTime())) return valStr;
      const day = d.getDate();
      const monthShort = monthNames[d.getMonth()].slice(0, 3);
      const year = d.getFullYear();
      return `${day} ${monthShort} ${year}`;
    } catch {
      return valStr;
    }
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-background hover:bg-card border border-border rounded-xl text-left transition-all shadow-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 group-hover:text-primary transition-colors">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-textPrimary text-xs tracking-wide">
              {formatDisplayDate(value)}
            </p>
            <p className="text-[10px] text-textSecondary font-mono">
              {value ? `${value}` : 'Pilih tanggal'}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-textSecondary transition-transform duration-200 flex-shrink-0 ml-1.5 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Floating Modern Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1 w-68 bg-card border border-border rounded-xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md hover:bg-background text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="font-bold text-xs text-textPrimary">
                {monthNames[viewMonth]} {viewYear}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md hover:bg-background text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {dayNames.map((d, idx) => (
              <div
                key={d}
                className={`text-[10px] font-medium py-0.5 ${
                  idx === 0 ? 'text-danger/80' : 'text-textSecondary'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Prev month fill */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayIndex + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="h-6.5 flex items-center justify-center text-[10px] text-textSecondary/30 font-medium"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = value === dateKey;
              const isToday = todayStr === dateKey;

              return (
                <button
                  type="button"
                  key={`day-${dayNum}`}
                  onClick={() => selectDate(viewYear, viewMonth, dayNum)}
                  className={`h-6.5 w-full rounded-md text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : isToday
                      ? 'bg-primary/10 text-primary font-bold border border-primary/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-textPrimary'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Preset Buttons (Net 7, Net 14, Net 30) */}
          {quickPresets && (
            <div className="pt-2 border-t border-border flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => applyPresetDays(0)}
                className="py-0.5 px-2 rounded bg-background hover:bg-primary/10 text-textSecondary hover:text-primary text-[10px] font-medium border border-border transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => applyPresetDays(7)}
                className="py-0.5 px-2 rounded bg-background hover:bg-primary/10 text-textSecondary hover:text-primary text-[10px] font-medium border border-border transition-colors cursor-pointer"
              >
                +7 Hari
              </button>
              <button
                type="button"
                onClick={() => applyPresetDays(14)}
                className="py-0.5 px-2 rounded bg-background hover:bg-primary/10 text-textSecondary hover:text-primary text-[10px] font-medium border border-border transition-colors cursor-pointer"
              >
                +14 Hari
              </button>
              <button
                type="button"
                onClick={() => applyPresetDays(30)}
                className="py-0.5 px-2 rounded bg-background hover:bg-primary/10 text-textSecondary hover:text-primary text-[10px] font-medium border border-border transition-colors cursor-pointer"
              >
                +30 Hari
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


/* =========================================================================
 * 3. SMART NOTES & TERMS EDITOR (Minimalist & Dynamic Construction Terms)
 * ========================================================================= */

interface SmartNotesEditorProps {
  value: string;
  onChange: (val: string) => void;
  category?: string;
  items?: any[];
  vendorName?: string;
  projectName?: string;
  poDate?: string;
  dueDate?: string;
  paymentTerms?: string;
}

export const SmartNotesEditor: React.FC<SmartNotesEditorProps> = ({
  value,
  onChange,
  category = 'Jasa Subkontraktor',
  items = [],
  vendorName = '',
  projectName = '',
  poDate = '',
  dueDate = '',
  paymentTerms = 'Net 30 Hari',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate dynamic construction terms based on current PO data
  const generateDynamicTerms = (templateType?: string) => {
    const selectedType = templateType || category;
    const vName = vendorName || 'Pihak Kedua (Vendor)';
    const pName = projectName || 'General / Operasional PT Coreterra Geo Engineering';
    const targetDueDate = dueDate || 'Sesuai kesepakatan';

    // Calculate days duration if both dates exist
    let durationText = '14 hari kalender';
    if (poDate && dueDate) {
      const d1 = new Date(poDate);
      const d2 = new Date(dueDate);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (!isNaN(diffDays) && diffDays > 0) {
        durationText = `${diffDays} hari kalender`;
      }
    }

    // Format items list naturally matching Image 2
    let itemsSummary = 'pekerjaan konstruksi sesuai spesifikasi PO';
    if (items && items.length > 0) {
      const validItems = items.filter((it) => it.description);
      if (validItems.length > 0) {
        itemsSummary = validItems
          .map((it) => {
            const qtyStr = it.quantity ? `(${Number(it.quantity).toLocaleString('id-ID')} ${it.unit || ''})`.trim() : '';
            return `${it.description} ${qtyStr}`.trim();
          })
          .join(' dan ');
      }
    }

    let generated = '';

    if (selectedType.includes('Jasa')) {
      // 1. Template Jasa Subkontraktor / Rebar / Boring
      generated = `1. Ruang Lingkup Pekerjaan: Pekerjaan terbatas pada Pembuatan / Fabrikasi Rebar saja (pemotongan, pembengkokan/bending, dan perakitan) sesuai spesifikasi teknis dan gambar kerja PT CGE. Tidak termasuk pekerjaan pemasangan/instalasi di lapangan.

2. Pengantaran: Pihak Kedua (${vName}) wajib mengantarkan hasil fabrikasi rebar ke lokasi kerja yang ditentukan oleh Pihak Pertama (PT CGE). Biaya pengantaran dan risiko selama pengiriman menjadi tanggung jawab Pihak Kedua.

3. Jangka Waktu Pelaksanaan: Pekerjaan fabrikasi dan pengantaran rebar dilaksanakan sesuai timeline proyek ${pName} yang telah disepakati bersama. Keterlambatan wajib dikonfirmasi dan disetujui tertulis oleh Pengawas Lapangan PT CGE.

4. Sistem Pembayaran: Pembayaran dilakukan maksimal 7 (tujuh) hari kalender setelah Invoice resmi diterima dan diverifikasi oleh Finance PT CGE, dilengkapi dengan Surat Jalan dan Berita Acara Serah Terima (BAST) yang telah ditandatangani.`;
    } else if (selectedType.includes('Material')) {
      // 2. Template Material Habis Pakai (Besi, Semen, Readymix, dll)
      generated = `1. Pengiriman Material: Pengadaan ${itemsSummary} wajib dikirim langsung ke lokasi proyek ${pName} dalam kondisi 100% baru, berkualitas prima, dan terlindung dari karat/kerusakan.

2. Dokumen Pengiriman: Setiap kedatangan material wajib menyertakan Surat Jalan Asli (Delivery Order), Mill Certificate/Sertifikat Uji Pabrik, dan ditandatangani oleh Tim Logistik Lapangan PT CGE.

3. Hak Penolakan (Rejection): PT CGE berhak menolak dan mengembalikan material yang cacat, tidak memenuhi toleransi spesifikasi, atau rusak selama transit tanpa dikenakan biaya tambahan apapun.

4. Jadwal & Waktu Pengiriman: Pengiriman seluruh pesanan wajib tiba paling lambat tanggal ${targetDueDate}. Keterlambatan sepihak dikenakan denda sesuai kontrak.

5. Ketentuan Pembayaran: Pembayaran ditransfer ke rekening resmi ${vName} sesuai termin ${paymentTerms} setelah Invoice Asli, Surat Jalan bermeterai, dan BAST fisik diterima dan diverifikasi Finance.`;
    } else if (selectedType.includes('Sewa')) {
      // 3. Template Sewa Alat Proyek / Rig Bor / Genset
      generated = `1. Ruang Lingkup Sewa: Penyewaan unit ${itemsSummary} untuk mendukung aktivitas operasional proyek ${pName}.

2. Mobilisasi & Kesiapan: Unit tiba di lokasi proyek dalam kondisi prima dan siap beroperasi (ready for work). Jadwal mob-demob dikoordinasikan dengan Pihak Pertama (PT CGE).

3. Pemeliharaan & Kerusakan: Pihak Kedua (${vName}) berkewajiban menyediakan operator bersertifikat (SIO), mekanik stand-by, serta menanggung penggantian sparepart/perawatan rutin. Jam henti (breakdown) tidak dihitung dalam jam sewa.

4. Standar K3: Operator dan teknisi alat wajib mematuhi seluruh peraturan K3, perlengkapan APD lengkap, dan arahan Health & Safety Officer PT CGE di lapangan.

5. Pembayaran: Berdasarkan rekonsiliasi Time Sheet harian yang telah disetujui Project Manager PT CGE, ditagihkan melalui invoice resmi.`;
    } else {
      // 4. Template Umum / Aset / Kantor
      generated = `1. Penyerahan Barang: Pengadaan ${itemsSummary} diserahkan dalam kemasan asli, segel pabrik utuh, dan bergaransi resmi.

2. Kelengkapan Dokumen: Pengiriman wajib melampirkan Surat Jalan Asli, Buku Manual, Kartu Garansi Resmi, dan Faktur Pajak/Invoice atas nama PT Coreterra Geo Engineering.

3. Jaminan & Garansi: Pihak Vendor (${vName}) memberikan jaminan purna jual dan garansi servis/suku cadang minimal 1 (satu) tahun sejak tanggal serah terima.

4. Pemeriksaan (QC): Pihak PT CGE berhak melakukan pengujian fungsi (commissioning test) sebelum dokumen BAST ditandatangani.

5. Pembayaran: Pembayaran dilakukan via transfer bank dalam jangka waktu ${paymentTerms} (Jatuh tempo: ${targetDueDate}).`;
    }

    onChange(generated);
  };

  // Smart KeyDown handler inside Textarea (Auto-numbering & Auto-bullets on Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPosition);
      const textAfterCursor = value.substring(cursorPosition);

      // Find the current line before the cursor
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      // Match numbered list like "1. ", "2. ", "   1. "
      const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s*(.*)$/);
      if (numberMatch) {
        e.preventDefault();
        const indent = numberMatch[1];
        const currentNum = parseInt(numberMatch[2], 10);
        const lineContent = numberMatch[3].trim();

        // If line is empty (e.g. user pressed enter on "5. "), terminate list
        if (lineContent === '') {
          const newTextBefore = textBeforeCursor.replace(/(\d+)\.\s*$/, '');
          const newText = newTextBefore + '\n' + textAfterCursor;
          onChange(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = newTextBefore.length + 1;
          }, 0);
          return;
        }

        // Otherwise insert next number
        const nextNum = currentNum + 1;
        const insertText = `\n${indent}${nextNum}. `;
        const newText = textBeforeCursor + insertText + textAfterCursor;
        onChange(newText);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPosition + insertText.length;
        }, 0);
        return;
      }

      // Match bullet list like "• ", "- ", "* ", "   • "
      const bulletMatch = currentLine.match(/^(\s*)([•\-\*])\s*(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bulletChar = bulletMatch[2];
        const lineContent = bulletMatch[3].trim();

        // If empty bullet, terminate list
        if (lineContent === '') {
          const newTextBefore = textBeforeCursor.replace(/([•\-\*])\s*$/, '');
          const newText = newTextBefore + '\n' + textAfterCursor;
          onChange(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = newTextBefore.length + 1;
          }, 0);
          return;
        }

        // Insert next bullet
        const insertText = `\n${indent}${bulletChar} `;
        const newText = textBeforeCursor + insertText + textAfterCursor;
        onChange(newText);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPosition + insertText.length;
        }, 0);
        return;
      }
    }

    // Support Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = value.substring(0, start) + '   ' + value.substring(end);
      onChange(newText);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 3;
      }, 0);
    }
  };

  // Convert selected text or all lines to numbered list (1., 2., 3.)
  const applyAutoNumbering = () => {
    if (!value.trim()) {
      onChange('1. ');
      return;
    }

    const lines = value.split('\n');
    let counter = 1;
    const formatted = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.toUpperCase().includes('SYARAT') || trimmed.toUpperCase().includes('TERMS')) {
        return line;
      }
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        return `   ${trimmed}`;
      }
      const cleanText = trimmed.replace(/^(\d+[\.\)]\s*)/, '');
      const res = `${counter}. ${cleanText}`;
      counter++;
      return res;
    });

    onChange(formatted.join('\n'));
  };

  // Convert lines to bullet points (• )
  const applyBulletPoints = () => {
    if (!value.trim()) {
      onChange('• ');
      return;
    }

    const lines = value.split('\n');
    const formatted = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.toUpperCase().includes('SYARAT') || trimmed.toUpperCase().includes('TERMS')) {
        return line;
      }
      const cleanText = trimmed.replace(/^(\d+[\.\)]\s*|[•\-\*]\s*)/, '');
      return `• ${cleanText}`;
    });

    onChange(formatted.join('\n'));
  };

  // Clean and tidy spacing
  const formatTidyText = () => {
    if (!value.trim()) return;
    const lines = value.split('\n');
    const tidied = lines.map((l) => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n');
    onChange(tidied);
  };

  return (
    <div className="space-y-1.5">
      {/* Header & Smart Generator Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-textSecondary uppercase tracking-wider">
          Catatan & Syarat Ketentuan (Terms & Conditions)
        </label>

        {/* Dynamic Generator Action - Clean & Professional */}
        <button
          type="button"
          onClick={() => generateDynamicTerms()}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          title="Otomatiskan syarat ketentuan dari data item PO, vendor, dan proyek"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto-Generate dari Item PO</span>
        </button>
      </div>

      {/* Editor Card with Integrated Formatting Toolbar */}
      <div className="border border-border rounded-xl bg-background overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
        {/* Toolbar */}
        <div className="px-2 py-1 bg-card/60 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Formatting Tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={applyAutoNumbering}
              className="px-2 py-0.5 bg-background hover:bg-slate-200 dark:hover:bg-slate-700 text-textPrimary rounded text-[11px] font-medium flex items-center gap-1 border border-border transition-colors cursor-pointer"
              title="Penomoran Otomatis (1., 2., 3.)"
            >
              <ListOrdered className="w-3.5 h-3.5 text-textSecondary" />
              <span>1. Nomor</span>
            </button>

            <button
              type="button"
              onClick={applyBulletPoints}
              className="px-2 py-0.5 bg-background hover:bg-slate-200 dark:hover:bg-slate-700 text-textPrimary rounded text-[11px] font-medium flex items-center gap-1 border border-border transition-colors cursor-pointer"
              title="Bullet Point (•)"
            >
              <List className="w-3.5 h-3.5 text-textSecondary" />
              <span>• Bullet</span>
            </button>

            <button
              type="button"
              onClick={formatTidyText}
              className="px-2 py-0.5 bg-background hover:bg-slate-200 dark:hover:bg-slate-700 text-textSecondary hover:text-textPrimary rounded text-[11px] font-medium flex items-center gap-1 border border-border transition-colors cursor-pointer"
              title="Rapikan spasi"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Rapikan</span>
            </button>

            <button
              type="button"
              onClick={() => onChange('')}
              className="px-2 py-0.5 bg-background hover:bg-danger/10 text-textSecondary hover:text-danger rounded text-[11px] font-medium flex items-center gap-1 border border-border transition-colors cursor-pointer"
              title="Kosongkan catatan"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-textSecondary text-[10px] uppercase font-semibold mr-0.5">Preset:</span>
            <button
              type="button"
              onClick={() => generateDynamicTerms('Jasa Subkontraktor')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-textPrimary dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-medium border border-border transition-colors cursor-pointer flex items-center gap-1"
            >
              <HardHat className="w-3 h-3 text-textSecondary" /> Subkon
            </button>
            <button
              type="button"
              onClick={() => generateDynamicTerms('Material Habis Pakai Proyek')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-textPrimary dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-medium border border-border transition-colors cursor-pointer flex items-center gap-1"
            >
              <Package className="w-3 h-3 text-textSecondary" /> Material
            </button>
            <button
              type="button"
              onClick={() => generateDynamicTerms('Sewa Alat Proyek')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-textPrimary dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-medium border border-border transition-colors cursor-pointer flex items-center gap-1"
            >
              <Truck className="w-3 h-3 text-textSecondary" /> Sewa Alat
            </button>
            <button
              type="button"
              onClick={() => generateDynamicTerms('Umum')}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-textPrimary dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-medium border border-border transition-colors cursor-pointer flex items-center gap-1"
            >
              <Building2 className="w-3 h-3 text-textSecondary" /> Standar
            </button>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={6}
          placeholder="Ketik catatan dan syarat ketentuan... Tekan Enter untuk melanjutkan nomor urut (1, 2, 3) atau gunakan tombol 'Auto-Generate dari Item PO'."
          className="w-full p-2.5 bg-transparent text-textPrimary placeholder:text-textSecondary/50 focus:outline-none text-xs leading-relaxed font-sans"
        />

        {/* Footer info */}
        <div className="px-2.5 py-1 bg-card/40 border-t border-border flex items-center justify-between text-[10px] text-textSecondary">
          <div className="flex items-center gap-1.5">
            <Info className="w-3 h-3 text-textSecondary flex-shrink-0" />
            <span>Tekan <kbd className="px-1 py-0.2 bg-background border border-border rounded font-mono">Enter</kbd> untuk melanjutkan penomoran/bullet otomatis.</span>
          </div>
          <span className="font-mono">
            {value ? `${value.split('\n').filter(Boolean).length} baris` : '0 baris'}
          </span>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
 * 4. FORMATTED TERMS DISPLAY (Clean Hanging Indent & Paragraph Spacing)
 * ========================================================================= */

export const FormattedTermsDisplay: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const rawLines = text.split('\n');

  // Filter out redundant top header if it contains SYARAT & KETENTUAN (since parent container already has header)
  let startIndex = 0;
  if (rawLines[0] && rawLines[0].trim().toUpperCase().includes('SYARAT & KETENTUAN')) {
    startIndex = 1;
  }

  const lines = rawLines.slice(startIndex);

  return (
    <div className="space-y-2 text-xs text-slate-700 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Match numbered item like "1. Ruang Lingkup..." or "2. Material..."
        const numMatch = trimmed.match(/^(\d+)[\.\)]\s*(.*)$/);
        if (numMatch) {
          const num = numMatch[1];
          const content = numMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 pt-0.5">
              <span className="font-bold text-slate-900 w-5 flex-shrink-0 text-right">
                {num}.
              </span>
              <div className="flex-1 min-w-0">
                {content}
              </div>
            </div>
          );
        }

        // Match sub-bullet like "- Pembayaran..." or "• Pembayaran..."
        const subMatch = trimmed.match(/^([•\-\*])\s*(.*)$/);
        if (subMatch) {
          const content = subMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 ml-7 -mt-0.5">
              <span className="text-slate-400 font-bold flex-shrink-0 w-3 text-center">
                –
              </span>
              <div className="flex-1 min-w-0 text-slate-600">
                {content}
              </div>
            </div>
          );
        }

        // Normal line or sub-header
        return (
          <div key={idx} className="pl-7">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
};

