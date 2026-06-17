import { createHash } from 'crypto';

// ------------------------------------------------------------------
// Formatação de datas para a API do PNCP (AAAAMMDD)
// ------------------------------------------------------------------
export function formatPncpDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function parsePncpDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  // Pode vir como "2024-01-15", "20240115", "2024-01-15T00:00:00"
  const clean = dateStr.substring(0, 10).replace(/-/g, '');
  if (clean.length !== 8) return null;
  const y = parseInt(clean.substring(0, 4));
  const m = parseInt(clean.substring(4, 6)) - 1;
  const d = parseInt(clean.substring(6, 8));
  const dt = new Date(y, m, d);
  return isNaN(dt.getTime()) ? null : dt;
}

export function parsePncpDateTime(str: string | undefined | null): Date | null {
  if (!str) return null;
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

// Gera janelas diárias entre dataInicial e dataFinal (inclusive)
export function gerarJanelasSync(
  dataInicial: Date,
  dataFinal: Date,
  windowDays = 1,
): Array<{ inicio: Date; fim: Date }> {
  const janelas: Array<{ inicio: Date; fim: Date }> = [];
  const cur = new Date(dataInicial);
  while (cur <= dataFinal) {
    const fim = new Date(cur);
    fim.setDate(fim.getDate() + windowDays - 1);
    if (fim > dataFinal) fim.setTime(dataFinal.getTime());
    janelas.push({ inicio: new Date(cur), fim: new Date(fim) });
    cur.setDate(cur.getDate() + windowDays);
  }
  return janelas;
}

// ------------------------------------------------------------------
// Hash de conteúdo para deduplicação e detecção de mudanças
// ------------------------------------------------------------------
export function hashObjeto(obj: unknown): string {
  const json = JSON.stringify(obj, Object.keys(obj as object).sort());
  return createHash('sha256').update(json).digest('hex').substring(0, 16);
}

// ------------------------------------------------------------------
// syncKey — chave única por entidade + janela temporal
// ------------------------------------------------------------------
export function buildSyncKey(
  entityType: string,
  dataInicial: string,
  dataFinal: string,
  extra?: string,
): string {
  const parts = [entityType, dataInicial, dataFinal];
  if (extra) parts.push(extra);
  return parts.join(':');
}

// ------------------------------------------------------------------
// Estatísticas de uma execução de sync
// ------------------------------------------------------------------
export interface SyncStats {
  registrosProcessados: number;
  registrosInseridos: number;
  registrosAtualizados: number;
  registrosDuplicados: number;
  erros: number;
}

export function emptySyncStats(): SyncStats {
  return {
    registrosProcessados: 0,
    registrosInseridos: 0,
    registrosAtualizados: 0,
    registrosDuplicados: 0,
    erros: 0,
  };
}

export function mergeSyncStats(a: SyncStats, b: SyncStats): SyncStats {
  return {
    registrosProcessados: a.registrosProcessados + b.registrosProcessados,
    registrosInseridos: a.registrosInseridos + b.registrosInseridos,
    registrosAtualizados: a.registrosAtualizados + b.registrosAtualizados,
    registrosDuplicados: a.registrosDuplicados + b.registrosDuplicados,
    erros: a.erros + b.erros,
  };
}
