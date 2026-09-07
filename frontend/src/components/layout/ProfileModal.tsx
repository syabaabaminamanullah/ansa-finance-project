import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Save, Phone, Mail, User, Lock, Eye, Loader2 } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { useProfileStore } from '../../store/profileStore';
import { profileApi } from '../../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const addToast = useToastStore((state) => state.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { profile: globalProfile, saveProfile, fetchProfile } = useProfileStore();
  
  const [profile, setProfile] = useState({
    name: globalProfile.name,
    username: globalProfile.username,
    email: globalProfile.email,
    phone: globalProfile.phone,
  });
  
  const [profilePhoto, setProfilePhoto] = useState<string | null>(globalProfile.photo);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchProfile();
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setProfile({
        name: globalProfile.name,
        username: globalProfile.username,
        email: globalProfile.email,
        phone: globalProfile.phone,
      });
      setProfilePhoto(globalProfile.photo);
    }
  }, [isOpen, globalProfile]);

  if (!isOpen || !mounted) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveProfile({
        ...profile,
        photo: profilePhoto
      });
      addToast('success', 'Profil Berhasil Disimpan', 'Data profil & foto telah tersimpan permanen di database.');
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Gagal menyimpan profil ke database.';
      addToast('error', 'Gagal Simpan', typeof msg === 'string' ? msg : 'Error saat menyimpan profil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      addToast('error', 'Validasi Gagal', 'Password baru dan konfirmasi tidak cocok.');
      return;
    }
    if (passwords.new.length < 4) {
      addToast('error', 'Validasi Gagal', 'Password minimal 4 karakter.');
      return;
    }
    setIsSubmitting(true);
    try {
      await profileApi.updateSecurity({
        current_password: passwords.current,
        new_password: passwords.new
      });
      addToast('success', 'Password Diperbarui', 'Password akun Anda berhasil disimpan ke database.');
      setPasswords({ current: '', new: '', confirm: '' });
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Password saat ini salah.';
      addToast('error', 'Gagal Ubah Password', typeof msg === 'string' ? msg : 'Gagal memperbarui password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to persistent Base64 Data URL (Never expires or gets revoked on restart)
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setProfilePhoto(base64);
        addToast('success', 'Foto Terpilih', `${file.name} siap disimpan ke database.`);
      };
      reader.readAsDataURL(file);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-xl rounded-xl shadow-xl border border-border flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border bg-background/50">
          <h2 className="text-xl font-bold text-textPrimary">My Profile Settings</h2>
          <button onClick={onClose} className="text-textSecondary hover:text-textPrimary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-background/30">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-secondary/10'}`}
          >
            Personal Information
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-textSecondary hover:text-textPrimary hover:bg-secondary/10'}`}
          >
            Account Security
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'profile' && (
            <form id="profileForm" onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* Photo Upload */}
              <div className="flex flex-col items-center justify-center gap-3">
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                
                <div className="relative group">
                  <div 
                    onClick={() => profilePhoto ? setIsPreviewOpen(true) : handlePhotoClick()}
                    className="w-24 h-24 rounded-full bg-secondary/30 text-primary flex flex-col items-center justify-center border-2 border-dashed border-primary cursor-pointer hover:border-primary/80 transition-colors relative overflow-hidden"
                  >
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold font-sans">
                        {profile.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                      {profilePhoto ? <Eye className="w-6 h-6 mb-1" /> : <Camera className="w-6 h-6 mb-1" />}
                      <span className="text-[10px] font-medium uppercase tracking-wider">{profilePhoto ? 'View' : 'Upload'}</span>
                    </div>
                  </div>

                  {/* Change Photo Button (Small Badge) */}
                  {profilePhoto && (
                    <button 
                      type="button"
                      onClick={handlePhotoClick}
                      className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors z-10"
                      title="Change Photo"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                    <input required type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                    <input required type="text" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                    <input required type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
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
            </form>
          )}

          {activeTab === 'security' && (
            <form id="securityForm" onSubmit={handleSaveSecurity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <input required type="password" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-sm font-medium text-textSecondary mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <input required type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <input required type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border flex justify-end gap-3 bg-secondary/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-textSecondary font-medium hover:text-textPrimary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={activeTab === 'profile' ? 'profileForm' : 'securityForm'}
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>

      {/* Large Photo Preview Modal */}
      {isPreviewOpen && profilePhoto && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm" 
          onClick={() => setIsPreviewOpen(false)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors" 
            onClick={() => setIsPreviewOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={profilePhoto} 
            alt="Profile Large Preview" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" 
            onClick={e => e.stopPropagation()} 
          />
        </div>
      )}
    </div>,
    document.body
  );
}
