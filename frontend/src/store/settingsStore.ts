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
  logoBase64?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

interface SettingsState {
  settings: CompanySettings;
  setSettings: (settings: Partial<CompanySettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        companyName: 'PT. CoreTerra Geo Engineering',
        taxId: '01.234.567.8-901.000',
        email: 'admin.cge@coreterra-geo.com',
        phone: '081214941641',
        address: 'Ciputat, Tangerang Selatan, Banten, Indonesia, Kode Pos 15411',
        baseCurrency: 'IDR',
        timezone: 'Asia/Jakarta',
        dateFormat: 'DD/MM/YYYY',
        bankName: 'Bank Mandiri',
        bankAccountNumber: '103-00-1332575-4',
        bankAccountName: 'PT Coreterra Geo Engineering',
      },
      setSettings: (newSettings) => 
        set((state) => ({ 
          settings: { ...state.settings, ...newSettings } 
        })),
    }),
    {
      name: 'ansa-settings-storage',
      merge: (persistedState: any, currentState: SettingsState) => ({
        ...currentState,
        settings: {
          ...currentState.settings,
          ...(persistedState?.settings || {}),
          bankName: persistedState?.settings?.bankName || currentState.settings.bankName || 'Bank Mandiri',
          bankAccountNumber: persistedState?.settings?.bankAccountNumber || currentState.settings.bankAccountNumber || '103-00-1332575-4',
          bankAccountName: persistedState?.settings?.bankAccountName || persistedState?.settings?.companyName || currentState.settings.bankAccountName || 'PT Coreterra Geo Engineering',
        }
      })
    }
  )
);
