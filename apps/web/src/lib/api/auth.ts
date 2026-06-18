import { apiClient } from './client';
import type { SubscriptionPlan, SubscriptionStatus } from '../subscription';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  cnpj?: string;
  companyName?: string;
  segment?: string;
  role?: string;
  planChoice: 'TRIAL' | 'STARTER_MONTHLY' | 'STARTER_ANNUAL' | 'PRO_MONTHLY' | 'PRO_ANNUAL' | 'ENTERPRISE';
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  hasUsedTrial?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    nome: string;
    role: string;
    tenantId: string;
  };
  subscription?: SubscriptionInfo | null;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  subscription: SubscriptionInfo;
  checkoutUrl?: string;  // só para planos pagos
  requireEmailVerification: boolean;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const { data } = await apiClient.post<RegisterResponse>('/auth/register', payload);
    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  me: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, password });
  },

  resendVerification: async (): Promise<void> => {
    await apiClient.post('/auth/resend-verification');
  },

  startTrial: async (cnpj?: string): Promise<SubscriptionInfo> => {
    const { data } = await apiClient.post<SubscriptionInfo>('/subscriptions/trial', { cnpj });
    return data;
  },

  createCheckout: async (priceId: string): Promise<{ checkoutUrl: string }> => {
    const { data } = await apiClient.post<{ checkoutUrl: string }>('/subscriptions/checkout', { priceId });
    return data;
  },

  getMySubscription: async (): Promise<SubscriptionInfo> => {
    const { data } = await apiClient.get<SubscriptionInfo>('/subscriptions/me');
    return data;
  },
};
