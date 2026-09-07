import React, { useState, useRef } from 'react';
import { Building2, Save, MapPin, Mail, Phone, Hash } from 'lucide-react';
import { useToastStore } from '../../../store/toastStore';
import { useSettingsStore } from '../../../store/settingsStore';

export function GeneralSettings() {
  const addToast = useToastStore((state) => state.addToast);
  const { settings: globalSettings, setSettings: setGlobalSettings } = useSettingsStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [profile, setProfile] = useState({
    companyName: globalSettings.companyName,
    taxId: globalSettings.taxId,
    email: globalSettings.email,
    phone: globalSettings.phone,
    address: globalSettings.address,
    baseCurrency: globalSettings.baseCurrency,
    timezone: globalSettings.timezone,
    dateFormat: globalSettings.dateFormat,
    logoBase64: globalSettings.logoBase64
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, logoBase64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setGlobalSettings(profile);
      addToast('success', 'Settings Saved', 'Company profile updated successfully.');
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">General Settings</h1>
        <p className="text-textSecondary mt-1">Manage your company profile and primary formatting preferences.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Company Profile Section */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-textPrimary">Company Profile</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-6">
              <div 
                className="w-24 h-24 bg-secondary/20 rounded-xl flex items-center justify-center border border-border border-dashed relative group cursor-pointer hover:bg-secondary/30 transition-colors overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {profile.logoBase64 ? (
                  <img src={profile.logoBase64} alt="Company Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-4xl font-bold text-primary">{profile.companyName ? profile.companyName.charAt(0) : 'A'}</span>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-white font-medium">Upload Logo</span>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Company Name</label>
                  <input type="text" value={profile.companyName} onChange={e => setProfile({...profile, companyName: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Tax ID (NPWP)</label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                    <input type="text" value={profile.taxId} onChange={e => setProfile({...profile, taxId: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Contact Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-textSecondary" />
                <textarea rows={2} value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </div>
        </div>

        {/* Regional & Formatting Section */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
            <h2 className="font-bold text-textPrimary">Regional & Formatting</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Base Currency</label>
              <select value={profile.baseCurrency} onChange={e => setProfile({...profile, baseCurrency: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="IDR">IDR (Indonesian Rupiah)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="SGD">SGD (Singapore Dollar)</option>
              </select>
              <p className="text-xs text-textSecondary mt-1">Main currency used for accounting and reports.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Timezone</label>
              <select value={profile.timezone} onChange={e => setProfile({...profile, timezone: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Date Format</label>
              <select value={profile.dateFormat} onChange={e => setProfile({...profile, dateFormat: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50">
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>
    </div>
  );
}
