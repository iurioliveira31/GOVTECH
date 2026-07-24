import { apiClient } from './client';

export interface WalletConfig {
  ibgesMunicipios: string[];
  tier1Ibges: string[];
  tier2Ibges: string[];
  mesorregioes: string[];
  categoriasEquipamento: string[];
  bandaMinima: 'A' | 'B' | 'C' | 'D';
  fontes: string[];
  palavrasChaveExtra: string[];
  alertaWhatsapp?: string;
  alertaEmail?: string;
  alertaTelegram?: string;
  ativo: boolean;
}

/** Busca a configuração de carteira do tenant autenticado */
export async function getWalletConfig(): Promise<WalletConfig> {
  const { data } = await apiClient.get('/wallet-config');
  return data;
}

/** Atualiza a configuração de carteira */
export async function updateWalletConfig(config: Partial<WalletConfig>): Promise<WalletConfig> {
  const { data } = await apiClient.put('/wallet-config', config);
  return data;
}

/**
 * Busca resoluções filtradas pelo perfil de carteira do tenant.
 * Retorna apenas oportunidades relevantes para o portfólio configurado.
 */
export async function getResolucoesPorCarteira(): Promise<any[]> {
  const { data } = await apiClient.get('/wallet-config/resolucoes');
  return Array.isArray(data) ? data : (data?.data ?? []);
}
