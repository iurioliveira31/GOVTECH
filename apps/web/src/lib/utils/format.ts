/**
 * Formata valores monetários em BRL
 */
export function formatCurrency(value?: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata número compacto (1.2M, 500K)
 */
export function formatCompact(value?: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Formata data ISO para pt-BR
 */
export function formatDate(date?: string | null): string {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return date;
  }
}

/**
 * Formata data + hora
 */
export function formatDateTime(date?: string | null): string {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  } catch {
    return date;
  }
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export function formatCnpj(cnpj?: string | null): string {
  if (!cnpj) return '—';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Dias até uma data futura
 */
export function diasAte(date?: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Badge color para situação de licitação
 */
export function situacaoBadgeClass(situacao?: string): string {
  const map: Record<string, string> = {
    Publicada: 'badge-info',
    Homologada: 'badge-success',
    Revogada: 'badge-danger',
    Anulada: 'badge-danger',
    Suspensa: 'badge-warning',
    Encerrada: 'badge-neutral',
  };
  return map[situacao ?? ''] ?? 'badge-neutral';
}

/**
 * Trunca texto com ellipsis
 */
export function truncate(text?: string | null, max = 80): string {
  if (!text) return '—';
  return text.length > max ? text.slice(0, max) + '…' : text;
}
