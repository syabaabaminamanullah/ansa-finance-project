import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './storage';
import { profileApi } from '../services/api';

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  phone: string;
  photo: string | null;
}

interface ProfileState {
  profile: UserProfile;
  isLoading: boolean;
  fetchProfile: () => Promise<void>;
  setProfile: (profile: Partial<UserProfile>) => void;
  saveProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: {
        name: 'Super Admin',
        username: 'admin',
        email: 'admin@ansa.com',
        phone: '+62 812 3456 7890',
        photo: null,
      },
      isLoading: false,
      fetchProfile: async () => {
        try {
          set({ isLoading: true });
          const res = await profileApi.getProfile();
          if (res.data) {
            set({
              profile: {
                name: res.data.name || 'Super Admin',
                username: res.data.username || 'admin',
                email: res.data.email || 'admin@ansa.com',
                phone: res.data.phone || '+62 812 3456 7890',
                photo: res.data.photo || null,
              }
            });
          }
        } catch (err) {
          console.warn('Failed to fetch profile from backend, using cached profile.', err);
        } finally {
          set({ isLoading: false });
        }
      },
      setProfile: (newProfile) => 
        set((state) => ({ 
          profile: { ...state.profile, ...newProfile } 
        })),
      saveProfile: async (newProfile) => {
        const merged = { ...get().profile, ...newProfile };
        set({ profile: merged });
        try {
          await profileApi.updateProfile(newProfile);
        } catch (err) {
          console.error('Failed to save profile to database', err);
          throw err;
        }
      }
    }),
    {
      name: 'ansa-profile-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
