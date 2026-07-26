import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CompanySettings {
  companyName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  baseCurrency: string;
  timezone: string;
  dateFormat: string;
}

interface SettingsState {
  settings: CompanySettings;
  setSettings: (settings: Partial<CompanySettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        companyName: 'ANSA Enterprise Ltd.',
        taxId: '01.234.567.8-901.000',
        email: 'contact@ansa.com',
        phone: '+62 811 2233 4455',
        address: 'Jl. Jend. Sudirman Kav 1, Jakarta',
        baseCurrency: 'IDR',
        timezone: 'Asia/Jakarta',
        dateFormat: 'DD/MM/YYYY'
      },
      setSettings: (newSettings) => 
        set((state) => ({ 
          settings: { ...state.settings, ...newSettings } 
        })),
    }),
    {
      name: 'ansa-settings-storage',
    }
  )
);
