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

// Response interceptor — refresh token ou redirect para /login
apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('no_refresh');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken: refresh,
        });
        localStorage.setItem('access_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken);
        }
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch {
        // Limpa sessão e redireciona para login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
