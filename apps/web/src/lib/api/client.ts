import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Request interceptor — injeta Bearer token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — unwrap data envelope, refresh token ou redirect para /login
apiClient.interceptors.response.use(
  (res) => {
    // A API Gateway usa TransformInterceptor que envelopa as respostas em { success: true, data: ... }
    if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  async (err) => {
    const original = err.config;
    // Só tenta refresh se:
    // 1. Erro 401
    // 2. Não está em retry
    // 3. Rodando no browser
    // 4. O request original JÁ tinha um Authorization header (token existia)
    const hadAuthHeader = !!original?.headers?.Authorization;
    if (
      err.response?.status === 401 &&
      !original._retry &&
      typeof window !== 'undefined' &&
      hadAuthHeader
    ) {
      original._retry = true;
      try {
        const refresh = window.localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('no_refresh');
        const { data: responseData } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken: refresh,
        });
        const tokens = responseData.success && responseData.data ? responseData.data : responseData;
        window.localStorage.setItem('access_token', tokens.accessToken);
        if (tokens.refreshToken) {
          window.localStorage.setItem('refresh_token', tokens.refreshToken);
        }
        original.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return apiClient(original);
      } catch {
        // Limpa sessão e redireciona para login
        window.localStorage.removeItem('access_token');
        window.localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
