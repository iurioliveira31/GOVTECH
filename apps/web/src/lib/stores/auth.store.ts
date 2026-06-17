import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type AuthResponse } from '../api/auth';

interface AuthUser {
  id: string;
  email: string;
  nome: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      isAuthenticated: () => {
        if (typeof window === 'undefined') return false;
        const token = localStorage.getItem('access_token');
        return !!token && !!get().user;
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res: AuthResponse = await authApi.login({ email, password });
          localStorage.setItem('access_token', res.accessToken);
          localStorage.setItem('refresh_token', res.refreshToken);
          set({ user: res.user, isLoading: false });
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Email ou senha inválidos';
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } finally {
          set({ user: null, isLoading: false });
          window.location.href = '/login';
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
