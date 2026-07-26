import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './storage';

interface UserProfile {
  name: string;
  username: string;
  email: string;
  phone: string;
  photo: string | null;
}

interface ProfileState {
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: {
        name: 'Super Admin',
        username: 'admin',
        email: 'admin@ansa.com',
        phone: '+62 812 3456 7890',
        photo: null,
      },
      setProfile: (newProfile) => 
        set((state) => ({ 
          profile: { ...state.profile, ...newProfile } 
        })),
    }),
    {
      name: 'ansa-profile-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
