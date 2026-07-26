import React from 'react';
import { Palette, Layout, Save } from 'lucide-react';
import { useToastStore } from '../../../store/toastStore';
import { useThemeStore } from '../../../store/themeStore';

export function AppearanceSettings() {
  const addToast = useToastStore((state) => state.addToast);
  const { theme, density, setTheme, setDensity } = useThemeStore();

  const handleSave = () => {
    addToast('success', 'Appearance Updated', 'Your visual preferences have been saved.');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Appearance</h1>
        <p className="text-textSecondary mt-1">Customize how the application looks on your device.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-8">
        {/* Theme */}
        <div>
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-primary" /> Theme Preference
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <div className="w-full h-24 bg-white rounded-lg border border-gray-200 mb-3 shadow-sm flex flex-col p-2">
                <div className="w-full h-4 bg-gray-100 rounded mb-2"></div>
                <div className="w-1/2 h-4 bg-blue-100 rounded"></div>
              </div>
              <p className="font-medium text-textPrimary">Light Mode</p>
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <div className="w-full h-24 bg-gray-900 rounded-lg border border-gray-700 mb-3 shadow-sm flex flex-col p-2">
                <div className="w-full h-4 bg-gray-800 rounded mb-2"></div>
                <div className="w-1/2 h-4 bg-blue-900 rounded"></div>
              </div>
              <p className="font-medium text-textPrimary">Dark Mode</p>
            </button>
            <button 
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <div className="w-full h-24 bg-gradient-to-r from-white to-gray-900 rounded-lg border border-gray-400 mb-3 shadow-sm flex flex-col p-2">
              </div>
              <p className="font-medium text-textPrimary">System Sync</p>
            </button>
          </div>
        </div>

        <hr className="border-border" />

        {/* Density */}
        <div>
          <h2 className="text-lg font-bold text-textPrimary flex items-center gap-2 mb-4">
            <Layout className="w-5 h-5 text-primary" /> Data Density
          </h2>
          <div className="space-y-3 max-w-md">
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${density === 'comfortable' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/10'}`}>
              <input type="radio" name="density" checked={density === 'comfortable'} onChange={() => setDensity('comfortable')} className="text-primary focus:ring-primary" />
              <div>
                <p className="font-medium text-textPrimary">Comfortable</p>
                <p className="text-sm text-textSecondary">More whitespace, easier to read</p>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${density === 'compact' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/10'}`}>
              <input type="radio" name="density" checked={density === 'compact'} onChange={() => setDensity('compact')} className="text-primary focus:ring-primary" />
              <div>
                <p className="font-medium text-textPrimary">Compact</p>
                <p className="text-sm text-textSecondary">Fits more data on screen</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
