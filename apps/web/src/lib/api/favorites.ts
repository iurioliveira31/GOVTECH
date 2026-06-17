import { apiClient } from './client';

export interface Favorite {
  id: string;
  entityType: 'procurement' | 'contract';
  entityId: string;
  label?: string;
  status: string;
  valorProposta?: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  name: string;
  keywords: string[];
  uf?: string;
  modalidadeId?: number;
  entidade: 'todos' | 'contratacoes' | 'contratos';
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
}

export const favoritesApi = {
  list: async (): Promise<Favorite[]> => {
    const { data } = await apiClient.get('/favorites');
    return data;
  },
  add: async (entityType: 'procurement' | 'contract', entityId: string, label?: string): Promise<Favorite> => {
    const { data } = await apiClient.post('/favorites', { entityType, entityId, label });
    return data;
  },
  removeByEntity: async (entityType: string, entityId: string): Promise<void> => {
    await apiClient.delete(`/favorites/entity/${entityType}/${entityId}`);
  },
  updateStatus: async (id: string, status: string, valorProposta?: number): Promise<Favorite> => {
    const { data } = await apiClient.patch(`/favorites/${id}/status`, { status, valorProposta });
    return data;
  },
};

export const alertsApi = {
  list: async (): Promise<Alert[]> => {
    const { data } = await apiClient.get('/alerts');
    return data;
  },
  create: async (payload: { name: string; keywords: string[]; uf?: string; entidade?: string }): Promise<Alert> => {
    const { data } = await apiClient.post('/alerts', payload);
    return data;
  },
  toggle: async (id: string, isActive: boolean): Promise<void> => {
    await apiClient.patch(`/alerts/${id}`, { isActive });
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/alerts/${id}`);
  },
};
