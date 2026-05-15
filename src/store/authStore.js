import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Auth state. Persisted to AsyncStorage so a returning user stays signed in.
 *
 * `isAuthenticated` is derived from `user != null` and is mirrored as a
 * field (not a selector) so React subscribes correctly.
 *
 * `isLoading` is transient — it tracks whether the first auth-state
 * resolution has happened. Not persisted.
 */
export const useAuthStore = create(
  persist(
    immer((set) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set((s) => {
          s.user = user;
          s.isAuthenticated = !!user;
        }),

      setProfile: (profile) =>
        set((s) => {
          s.profile = profile;
        }),

      setLoading: (isLoading) =>
        set((s) => {
          s.isLoading = isLoading;
        }),

      clearAuth: () =>
        set((s) => {
          s.user = null;
          s.profile = null;
          s.isAuthenticated = false;
        }),
    })),
    {
      name: 'safercaller-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist identity, not transient loading flag.
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);