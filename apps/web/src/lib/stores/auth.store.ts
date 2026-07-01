import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type AuthResponse } from '../api/auth';
import type { SubscriptionPlan, SubscriptionStatus } from '../subscription';

interface AuthUser {
  id: string;
  email: string;
  nome: string;
  telefone?: string;
  role: string;
  tenantId: string;
}

interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  hasUsedTrial?: boolean;
  trialDismissedAt?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  error: string | null;
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: () => boolean;
  setSubscription: (sub: SubscriptionInfo | null) => void;
  setUserAndTokens: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  updateUser: (data: Partial<AuthUser>) => void;
  dismissTrialBanner: () => void;
}

function setCookie(name: string, value: string, days = 1) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      subscription: null,
      isLoading: false,
      error: null,

      isAuthenticated: () => {
        if (typeof window === 'undefined') return false;
        return !!localStorage.getItem('access_token') && !!get().user;
      },

      setSubscription: (sub) => {
        set({ subscription: sub });
        // Sincroniza cookies para o middleware poder ler
        if (sub) {
          setCookie('sub_status', sub.status, 30);
          setCookie('sub_plan', sub.plan, 30);
          if (sub.trialEndsAt) setCookie('trial_ends_at', sub.trialEndsAt, 30);
        } else {
          deleteCookie('sub_status');
          deleteCookie('sub_plan');
          deleteCookie('trial_ends_at');
        }
      },

      setUserAndTokens: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        setCookie('access_token', accessToken, 1);
        set({ user });
      },

      updateUser: (data) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...data } });
        }
      },

      dismissTrialBanner: () => {
        const sub = get().subscription;
        if (!sub) return;
        const updated = { ...sub, trialDismissedAt: new Date().toISOString() };
        set({ subscription: updated });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res: AuthResponse = await authApi.login({ email, password });
          localStorage.setItem('access_token', res.accessToken);
          localStorage.setItem('refresh_token', res.refreshToken);
          // Setar cookie de access_token para o middleware (httpOnly seria melhor, mas aqui é SSR light)
          setCookie('access_token', res.accessToken, 1);

          set({ user: res.user, isLoading: false });

          // Carregar subscription se vier na resposta
          if (res.subscription) {
            get().setSubscription(res.subscription);
          }
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
          set({ user: null, subscription: null, isLoading: false });
          deleteCookie('access_token');
          deleteCookie('sub_status');
          deleteCookie('sub_plan');
          deleteCookie('trial_ends_at');
          window.location.href = '/login';
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, subscription: state.subscription }),
    },
  ),
);
