import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password: string;
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
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
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
};
